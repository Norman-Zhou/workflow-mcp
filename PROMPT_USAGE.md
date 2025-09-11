# Prompt 管理功能使用指南

本项目已集成了强大的 Prompt 管理功能，参考了 mcp-prompt-server 的设计，使用 TypeScript 重新实现。

## 功能特性

- 📁 **Prompt 文件管理**: 支持 YAML 和 JSON 格式的 prompt 文件
- 🔄 **动态加载**: 自动扫描和加载 prompts 目录中的所有 prompt 文件
- 🎯 **参数替换**: 支持 `{{参数名}}` 格式的动态参数替换
- 📋 **列表查看**: 快速查看所有可用的 prompt 及其描述
- 🔍 **详情查询**: 获取 prompt 的详细信息，包括参数列表
- ⚡ **即时执行**: 直接执行 prompt 并获取结果

## 可用工具

### 1. `load_prompts`
重新加载所有预设的 prompts

```bash
# 使用示例
load_prompts
```

### 2. `list_prompts`
获取所有可用的 prompt 名称和描述

```bash
# 使用示例
list_prompts
```

### 3. `get_prompt`
获取指定 prompt 的详细信息

```bash
# 使用示例
get_prompt --name "code_review"
```

### 4. `execute_prompt`
执行指定的 prompt，支持参数替换

```bash
# 使用示例
execute_prompt --name "code_review" --arguments '{"code": "function hello() { console.log('Hello World'); }", "language": "JavaScript", "focus": "代码质量"}'
```

## Prompt 文件格式

### YAML 格式示例

```yaml
name: example_prompt
description: 这是一个示例 prompt
author: workflow-mcp
version: 1.0.0
tags: [示例, 测试]
arguments:
  - name: input_text
    description: 输入的文本内容
    type: string
    required: true
  - name: style
    description: 输出风格
    type: string
    required: false
messages:
  - role: user
    content:
      type: text
      text: |
        请处理以下内容：
        
        输入内容: {{input_text}}
        输出风格: {{style}}
        
        请根据指定的风格处理输入内容。
```

### JSON 格式示例

```json
{
  "name": "example_prompt",
  "description": "这是一个示例 prompt",
  "author": "workflow-mcp",
  "version": "1.0.0",
  "tags": ["示例", "测试"],
  "arguments": [
    {
      "name": "input_text",
      "description": "输入的文本内容",
      "type": "string",
      "required": true
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "请处理以下内容：\n\n输入内容: {{input_text}}\n\n请进行相应的处理。"
      }
    }
  ]
}
```

## 内置示例 Prompts

项目已包含以下示例 prompts：

1. **code_review**: 代码审查助手
   - 分析代码质量、发现潜在问题
   - 参数: `code`, `language`, `focus`

2. **doc_generator**: 文档生成助手
   - 根据代码或需求生成技术文档
   - 参数: `content`, `doc_type`, `audience`

3. **code_generator**: 代码生成助手
   - 根据需求描述生成代码实现
   - 参数: `requirement`, `language`, `framework`

## 目录结构

```
workflow-mcp/
├── prompts/                 # Prompt 文件目录
│   ├── code_review.yaml     # 代码审查 prompt
│   ├── doc_generator.yaml   # 文档生成 prompt
│   └── code_generator.yaml  # 代码生成 prompt
├── src/
│   ├── types/
│   │   └── prompt.ts        # Prompt 类型定义
│   └── tools/
│       └── prompt-manager.ts # Prompt 管理工具
└── ...
```

## 使用建议

1. **组织 Prompts**: 将相关的 prompts 按功能分类存放
2. **命名规范**: 使用清晰、描述性的 prompt 名称
3. **参数设计**: 合理设计参数，提供清晰的描述
4. **版本管理**: 为 prompts 添加版本信息，便于维护
5. **标签分类**: 使用标签对 prompts 进行分类管理

## 扩展开发

如需添加新的 prompt 管理功能，可以在 `src/tools/prompt-manager.ts` 中扩展 `PromptManager` 类或添加新的工具函数。

主要扩展点：
- 添加新的文件格式支持
- 实现 prompt 模板继承
- 添加 prompt 验证功能
- 集成外部 prompt 库