> ## Documentation Index
> Fetch the complete documentation index at: https://docs.toapis.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Gemini 3 Pro Image 普通版 图像生成

> Gemini 3 Pro Image 普通版 支持文生图和图生图, 最多 6 张参考图.

<Note>
  **国内用户请注意：** 中国大陆用户请使用 `https://toapis.cn` 作为接口地址（Base URL）。文档示例中的 `https://toapis.com` 请替换为 `https://toapis.cn`。
</Note>

## 版本选择

| 版本                                                    | 参考图上限 | 适用场景          |
| ----------------------------------------------------- | ----- | ------------- |
| [普通版](../gemini-3-pro-image/generation)               | 6 张   | 文生图和少量参考图编辑   |
| [VIP](../gemini-3-pro-image-vip/generation)           | 14 张  | 需要更多参考图的编辑和组合 |
| [Official](../gemini-3-pro-image-official/generation) | 14 张  | 需要原生生成参数控制    |

参考图数量指输入图片总数, 不代表输出图片数量. 三个版本使用不同的模型 ID, 请按对应页面的参数和示例调用.

## 当前版本

使用 `model: "gemini-3-pro-image-preview"` 选择普通版, 支持文生图和最多 6 张参考图的图生图或图像编辑.
适合文生图和不超过 6 张参考图的编辑. 需要更多参考图时, 可查看上方 VIP 或 Official 文档.
请求异步执行, 提交成功后通过任务 ID 查询结果.

<Warning>
  `image_urls` 仅支持图片 URL, 不直接接收 base64. 请先使用 [上传图片接口](../../uploads/images) 获取可访问的 URL.
</Warning>

## 认证

<ParamField header="Authorization" type="string" required>
  所有接口均需要使用 Bearer Token 进行认证

  获取 API Key：访问 [API Key 管理页面](https://toapis.com/console/token) 获取您的 API Key

  使用时在请求头中添加：

  ```
  Authorization: Bearer YOUR_API_KEY
  ```
</ParamField>

## 请求参数

<ParamField body="model" type="string" default="gemini-3-pro-image-preview" required>
  图像生成模型名称

  可用模型别名：`nano-banana-pro`

  示例：`"gemini-3-pro-image-preview"`
</ParamField>

<ParamField body="prompt" type="string" required>
  图像生成的文本描述

  上游模型输入上限为 65,536 tokens。ToAPIs 不额外设置 1000 字符限制。
</ParamField>

<ParamField body="size" type="string">
  图像生成的尺寸比例

  支持的格式：

  * 比例：`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`
</ParamField>

<ParamField body="n" type="integer" default={1}>
  生成图像的数量

  固定为 1

  **⚠️ 注意：** 必须是纯数字（如 `1`），不要加引号，否则会报错
</ParamField>

<ParamField body="metadata" type="object">
  元数据参数，用于传递额外的配置选项

  <Expandable title="支持的元数据字段">
    <ParamField body="resolution" type="string" default="1K">
      输出图像分辨率

      支持的值：

      * `1K` - 1K 分辨率（默认）
      * `2K` - 2K 分辨率
      * `4K` - 4K 分辨率
    </ParamField>

    <ParamField body="orientation" type="string">
      图像方向

      支持的值：

      * `landscape` - 横向
      * `portrait` - 竖向
    </ParamField>
  </Expandable>
</ParamField>

<ParamField body="image_urls" type="object[]">
  参考图像 URL 列表，用于图生图或图像编辑

  <Expandable title="详细字段说明">
    <ParamField body="url" type="string" required>
      图像 URL 地址

      **⚠️ 仅支持 URL 格式（不再支持 base64）**

      * 公开可访问的图片 URL（http\:// 或 https\://）
      * 示例：`https://example.com/image.jpg`
      * 可使用 [上传图片接口](../../uploads/images) 上传本地图片获取 URL

      **限制：**

      * 单张图片不得超过 10MB
      * 支持格式：.jpeg, .jpg, .png, .webp
    </ParamField>
  </Expandable>

  **限制：** 最多 6 张图片
</ParamField>

## 响应字段

<ResponseField name="id" type="string">
  任务唯一标识符，用于查询任务状态
</ResponseField>

<ResponseField name="object" type="string">
  对象类型，固定为 `generation.task`
</ResponseField>

<ResponseField name="model" type="string">
  使用的模型名称
</ResponseField>

<ResponseField name="status" type="string">
  任务状态

  * `queued` - 排队等待处理
  * `in_progress` - 处理中
  * `completed` - 成功完成
  * `failed` - 失败
</ResponseField>

<ResponseField name="progress" type="integer">
  任务进度百分比（0-100）
</ResponseField>

<ResponseField name="created_at" type="integer">
  任务创建时间戳（Unix 时间戳）
</ResponseField>

<ResponseField name="metadata" type="object">
  任务元数据
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "gemini-3-pro-image-preview",
      "prompt": "未来城市的天际线，霓虹灯光",
      "size": "16:9",
      "n": 1,
      "metadata": {
        "resolution": "1K",
        "orientation": "landscape"
      }
    }'
  ```

  ```bash cURL (图生图示例) theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "gemini-3-pro-image-preview",
      "prompt": "增强这张城市照片的色彩和细节",
      "size": "16:9",
      "n": 1,
      "metadata": {
        "resolution": "2K"
      },
      "image_urls": ["https://example.com/city.jpg"]
    }'
  ```

  ```python Python theme={null}
  import requests

  response = requests.post(
      "https://toapis.com/v1/images/generations",
      headers={
          "Authorization": "Bearer your-ToAPIs-key",
          "Content-Type": "application/json"
      },
      json={
          "model": "gemini-3-pro-image-preview",
          "prompt": "未来城市的天际线，霓虹灯光",
          "size": "16:9",
          "n": 1,
          "metadata": {
              "resolution": "1K",
              "orientation": "landscape"
          }
      }
  )

  task = response.json()
  print(f"任务 ID: {task['id']}")
  print(f"状态: {task['status']}")
  ```

  ```python Python (图生图) theme={null}
  import requests

  response = requests.post(
      "https://toapis.com/v1/images/generations",
      headers={
          "Authorization": "Bearer your-ToAPIs-key",
          "Content-Type": "application/json"
      },
      json={
          "model": "gemini-3-pro-image-preview",
          "prompt": "增强这张城市照片的色彩和细节",
          "size": "16:9",
          "n": 1,
          "metadata": {
              "resolution": "2K"
          },
          "image_urls": ["https://example.com/city.jpg"]
      }
  )

  task = response.json()
  print(f"任务 ID: {task['id']}")
  print(f"状态: {task['status']}")
  ```

  ```javascript JavaScript theme={null}
  const response = await fetch('https://toapis.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-ToAPIs-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemini-3-pro-image-preview',
      prompt: '未来城市的天际线，霓虹灯光',
      size: '16:9',
      n: 1,
      metadata: {
        resolution: '1K',
        orientation: 'landscape'
      }
    })
  });

  const task = await response.json();
  console.log(`任务 ID: ${task.id}`);
  console.log(`状态: ${task.status}`);
  ```

  ```javascript JavaScript (图生图) theme={null}
  const response = await fetch('https://toapis.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-ToAPIs-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemini-3-pro-image-preview',
      prompt: '增强这张城市照片的色彩和细节',
      size: '16:9',
      n: 1,
      metadata: {
        resolution: '2K'
      },
      image_urls: ['https://example.com/city.jpg']
    })
  });

  const task = await response.json();
  console.log(`任务 ID: ${task.id}`);
  console.log(`状态: ${task.status}`);
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "id": "task_img_abc123def456",
    "object": "generation.task",
    "model": "gemini-3-pro-image-preview",
    "status": "queued",
    "progress": 0,
    "created_at": 1703884800,
    "metadata": {}
  }
  ```
</ResponseExample>

## 查询结果

提交响应中的 `id` 是任务 ID. 使用 [图片任务查询接口](../../tasks/image-status) 获取状态和最终图片.
任务查询和 [Webhook 回调](../../webhooks/task-webhooks) 沿用通用异步图片接口约定.
