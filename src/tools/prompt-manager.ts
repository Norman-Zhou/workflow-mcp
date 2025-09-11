import { server } from '../server.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { z } from 'zod';
import { Prompt, PromptListItem, PromptExecutionResult } from '../types/prompt.js';

/**
 * Prompt管理器类
 */
export class PromptManager {
  private promptsDir: string;
  private loadedPrompts: Map<string, Prompt> = new Map();

  constructor(projectPath: string) {
    this.promptsDir = join(projectPath, 'prompts');
    this.ensurePromptsDir();
  }

  /**
   * 确保prompts目录存在
   */
  private ensurePromptsDir(): void {
    if (!existsSync(this.promptsDir)) {
      mkdirSync(this.promptsDir, { recursive: true });
    }
  }

  /**
   * 加载所有prompts
   */
  async loadPrompts(): Promise<Prompt[]> {
    this.loadedPrompts.clear();
    const prompts: Prompt[] = [];

    try {
      const files = readdirSync(this.promptsDir);
      const promptFiles = files.filter(file =>
        file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')
      );

      for (const file of promptFiles) {
        try {
          const filePath = join(this.promptsDir, file);
          const content = readFileSync(filePath, 'utf8');

          let prompt: Prompt;
          if (file.endsWith('.json')) {
            prompt = JSON.parse(content);
          } else {
            // 简单的YAML解析（仅支持基本结构）
            prompt = this.parseYaml(content);
          }

          if (!prompt.name) {
            await server.sendLoggingMessage({
              level: "warning",
              data: `Warning: Prompt in ${file} is missing a name field. Skipping.`
            });
            continue;
          }

          // 添加文件信息
          const stats = statSync(filePath);
          prompt.createdAt = stats.birthtime.toISOString();
          prompt.updatedAt = stats.mtime.toISOString();

          this.loadedPrompts.set(prompt.name, prompt);
          prompts.push(prompt);
        } catch (error) {
          await server.sendLoggingMessage({
            level: "error",
            data: `Error loading prompt from ${file}: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }

      await server.sendLoggingMessage({
        level: "info",
        data: `Loaded ${prompts.length} prompts from ${this.promptsDir}`
      });
      return prompts;
    } catch (error) {
      await server.sendLoggingMessage({
        level: "error",
        data: `Error loading prompts: ${error instanceof Error ? error.message : String(error)}`
      });
      return [];
    }
  }

  /**
   * 简单的YAML解析器（仅支持基本结构）
   */
  private parseYaml(content: string): Prompt {
    const lines = content.split('\n');
    const result: any = {};
    const stack: { obj: any; key?: string; indent: number }[] = [{ obj: result, indent: -1 }];
    let multilineKey: string | null = null;
    let multilineContent: string[] = [];
    let multilineIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const indent = line.length - line.trimStart().length;
      
      // 处理多行文本
      if (multilineKey) {
        if (indent > multilineIndent || trimmedLine === '') {
          multilineContent.push(line.substring(multilineIndent));
          continue;
        } else {
          // 多行文本结束
          const currentContext = stack[stack.length - 1];
          currentContext.obj[multilineKey] = multilineContent.join('\n').trim();
          multilineKey = null;
          multilineContent = [];
        }
      }

      // 处理缩进变化 - 回退到合适的层级
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const currentContext = stack[stack.length - 1];

      if (trimmedLine.startsWith('- ')) {
         // 数组项
         const itemValue = trimmedLine.substring(2).trim();
         
         // 确保当前上下文是数组
         if (!Array.isArray(currentContext.obj)) {
           // 如果有key，说明需要在父对象中创建数组
           if (currentContext.key) {
             const parentContext = stack[stack.length - 2];
             parentContext.obj[currentContext.key] = [];
             currentContext.obj = parentContext.obj[currentContext.key];
           } else {
             // 直接转换为数组
             const keys = Object.keys(currentContext.obj);
             if (keys.length === 0) {
               // 空对象，直接替换为数组
               const parentContext = stack[stack.length - 2];
               if (parentContext && currentContext.key) {
                 parentContext.obj[currentContext.key] = [];
                 currentContext.obj = parentContext.obj[currentContext.key];
               }
             }
           }
         }

         if (itemValue.includes(':')) {
            // 对象数组项
            const item = {};
            const [key, ...valueParts] = itemValue.split(':');
            const value = valueParts.join(':').trim();
            
            if (value === '' || value === '|') {
              if (value === '|') {
                // 多行文本
                multilineKey = key;
                multilineContent = [];
                multilineIndent = indent + 2;
                (item as any)[key] = '';
              } else {
                // 嵌套对象
                (item as any)[key] = {};
                // 将item推入栈，以便后续处理其嵌套属性
                stack.push({ obj: item, indent });
              }
            } else {
              (item as any)[key] = this.parseValue(value);
            }
            currentContext.obj.push(item);
         } else {
           // 简单数组项
           currentContext.obj.push(this.parseValue(itemValue));
         }
      } else if (trimmedLine.includes(':')) {
        // 键值对
        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();
        
        if (value === '' || value === '|') {
          if (value === '|') {
            // 多行文本
            multilineKey = key;
            multilineContent = [];
            multilineIndent = indent + 2;
            currentContext.obj[key] = '';
          } else {
            // 嵌套对象或数组（待定）
            currentContext.obj[key] = {};
            stack.push({ obj: currentContext.obj[key], key, indent });
          }
        } else {
          currentContext.obj[key] = this.parseValue(value);
        }
      }
    }

    // 处理未完成的多行文本
    if (multilineKey && multilineContent.length > 0) {
      const currentContext = stack[stack.length - 1];
      currentContext.obj[multilineKey] = multilineContent.join('\n').trim();
    }

    return result as Prompt;
  }

  /**
   * 解析YAML值
   */
  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^\d+$/.test(value)) return parseInt(value);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }

  /**
   * 获取prompt列表
   */
  getPromptList(): PromptListItem[] {
    return Array.from(this.loadedPrompts.values()).map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      argumentCount: prompt.arguments?.length || 0,
      filePath: join(this.promptsDir, `${prompt.name}.yaml`),
      createdAt: prompt.createdAt,
      author: prompt.author,
      tags: prompt.tags
    }));
  }

  /**
   * 获取指定prompt
   */
  getPrompt(name: string): Prompt | undefined {
    return this.loadedPrompts.get(name);
  }

  /**
   * 保存prompt
   */
  async savePrompt(prompt: Prompt): Promise<void> {
    const filePath = join(this.promptsDir, `${prompt.name}.yaml`);
    const yamlContent = this.promptToYaml(prompt);
    writeFileSync(filePath, yamlContent, 'utf8');

    // 更新内存中的prompt
    prompt.updatedAt = new Date().toISOString();
    this.loadedPrompts.set(prompt.name, prompt);
  }

  /**
   * 将Prompt对象转换为YAML格式
   */
  private promptToYaml(prompt: Prompt): string {
    let yaml = `name: ${prompt.name}\n`;
    if (prompt.description) {
      yaml += `description: ${prompt.description}\n`;
    }
    if (prompt.author) {
      yaml += `author: ${prompt.author}\n`;
    }
    if (prompt.version) {
      yaml += `version: ${prompt.version}\n`;
    }
    if (prompt.tags && prompt.tags.length > 0) {
      yaml += `tags: [${prompt.tags.join(', ')}]\n`;
    }

    yaml += `arguments:\n`;
    if (prompt.arguments && prompt.arguments.length > 0) {
      for (const arg of prompt.arguments) {
        yaml += `  - name: ${arg.name}\n`;
        if (arg.description) {
          yaml += `    description: ${arg.description}\n`;
        }
        if (arg.type) {
          yaml += `    type: ${arg.type}\n`;
        }
        if (arg.required !== undefined) {
          yaml += `    required: ${arg.required}\n`;
        }
      }
    } else {
      yaml += `  []\n`;
    }

    yaml += `messages:\n`;
    for (const message of prompt.messages) {
      yaml += `  - role: ${message.role}\n`;
      yaml += `    content:\n`;
      yaml += `      type: ${message.content.type}\n`;
      yaml += `      text: |\n`;
      const textLines = message.content.text.split('\n');
      for (const line of textLines) {
        yaml += `        ${line}\n`;
      }
    }

    return yaml;
  }

  /**
   * 执行prompt
   */
  executePrompt(name: string, args: Record<string, any> = {}): PromptExecutionResult {
    const prompt = this.getPrompt(name);
    if (!prompt) {
      return {
        success: false,
        error: `Prompt '${name}' not found`
      };
    }

    try {
      let promptText = '';

      // 确保messages是数组
      if (!prompt.messages || !Array.isArray(prompt.messages)) {
        return {
          success: false,
          error: `Invalid messages format in prompt '${name}': expected array, got ${typeof prompt.messages}`,
          usedArguments: args
        };
      }

      // 处理用户消息
      const userMessages = prompt.messages.filter(msg => msg.role === 'user');

      for (const message of userMessages) {
        if (message.content && message.content.text) {
          let text = message.content.text;

          // 替换所有 {{arg}} 格式的参数
          for (const [key, value] of Object.entries(args)) {
            text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
          }

          promptText += text + '\n\n';
        }
      }

      return {
        success: true,
        content: promptText.trim(),
        usedArguments: args
      };
    } catch (error) {
      return {
        success: false,
        error: `Error executing prompt: ${error instanceof Error ? error.message : String(error)}`,
        usedArguments: args
      };
    }
  }
}

/**
 * 注册prompt管理相关的工具
 */
export function registerPromptTools(projectPath: string) {
  const promptManager = new PromptManager(projectPath);

  // 加载prompts
  server.tool(
    'load_prompts',
    '重新加载所有预设的prompts',
    {},
    async () => {
      const prompts = await promptManager.loadPrompts();
      return {
        content: [
          {
            type: 'text',
            text: `成功加载了 ${prompts.length} 个prompts。`
          }
        ]
      };
    }
  );

  // 获取prompt列表
  server.tool(
    'list_prompts',
    '获取所有可用的prompt名称和描述',
    {},
    async () => {
      await promptManager.loadPrompts();
      const promptList = promptManager.getPromptList();
      const promptNames = promptList.map(p => `- ${p.name}: ${p.description || '无描述'} (${p.argumentCount}个参数)`);
      return {
        content: [
          {
            type: 'text',
            text: `可用的prompts (${promptList.length}):\n${promptNames.join('\n')}`
          }
        ]
      };
    }
  );

  // 获取prompt详情
  server.tool(
    'get_prompt',
    '获取指定prompt的详细信息',
    {
      name: z.string().describe('Prompt名称')
    },
    async (args) => {
      await promptManager.loadPrompts();
      const prompt = promptManager.getPrompt(args.name);
      if (!prompt) {
        return {
          content: [
            {
              type: 'text',
              text: `未找到名为 '${args.name}' 的prompt。`
            }
          ]
        };
      }

      const argsList = Array.isArray(prompt.arguments)
        ? prompt.arguments.map(arg =>
          `- ${arg.name} (${arg.type || 'string'}): ${arg.description || '无描述'}`
        ).join('\n') : '无参数';

      return {
        content: [
          {
            type: 'text',
            text: `Prompt: ${prompt.name}\n描述: ${prompt.description || '无描述'}\n参数:\n${argsList}\n\n内容预览:\n${prompt.messages[0]?.content?.text?.substring(0, 200) || ''}...`
          }
        ]
      };
    }
  );

  // 执行prompt
  server.tool(
    'execute_prompt',
    '执行指定的prompt，支持参数替换',
    {
      name: z.string().describe('Prompt名称'),
      arguments: z.record(z.any()).optional().describe('Prompt参数，键值对格式')
    },
    async (args) => {
      await promptManager.loadPrompts();
      const result = promptManager.executePrompt(args.name, args.arguments || {});

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `执行失败: ${result.error}`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: result.content || ''
          }
        ]
      };
    }
  );
}