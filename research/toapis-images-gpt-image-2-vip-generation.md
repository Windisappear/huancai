> ## Documentation Index
> Fetch the complete documentation index at: https://docs.toapis.com/llms.txt
> Use this file to discover all available pages before exploring further.

# GPT-Image-2-VIP 图像生成

> 使用 gpt-image-2-vip 模型生成图像，参数与 gpt-image-2 一致，但支持全部常用宽高比

<Note>
  **国内用户请注意：** 中国大陆用户请使用 `https://toapis.cn` 作为接口地址（Base URL）。文档示例中的 `https://toapis.com` 请替换为 `https://toapis.cn`。
</Note>

* 统一的图像生成 API 接口
* 通过 `model` 参数选择 `gpt-image-2-vip`
* 参数与 `gpt-image-2` 保持一致
* 支持文生图、单图参考和多图参考生成
* 异步任务管理，通过任务 ID 查询结果

<Warning>
  **重要变更**：为了更好的性能和成本控制，我们不再支持在 `image_urls` / `reference_images` 中直接传入 base64 图片数据。请先使用 [上传图片接口](../../uploads/images) 上传图片，获取 URL 后再调用本接口。
</Warning>

## Authorizations

<ParamField header="Authorization" type="string" required>
  所有接口均需要使用 Bearer Token 进行认证

  获取 API Key：访问 [API Key 管理页面](https://toapis.com/console/token) 获取您的 API Key

  使用时在请求头中添加：

  ```
  Authorization: Bearer YOUR_API_KEY
  ```
</ParamField>

## Body

<ParamField body="model" type="string" default="gpt-image-2-vip" required>
  图像生成模型名称

  示例：`"gpt-image-2-vip"`
</ParamField>

<ParamField body="prompt" type="string" required>
  图像生成的文本描述

  最长 32,000 个字符（GPT image models 官方上限）
</ParamField>

<ParamField body="size" type="string" default="1:1">
  输出图像比例

  支持以下预设比例：

  `1:1`、`3:2`、`2:3`、`4:3`、`3:4`、`5:4`、`4:5`、`16:9`、`9:16`、`2:1`、`1:2`、`21:9`、`9:21`

  也支持使用 `宽:高` 格式传入任意比例，例如 `1:3`、`7:4`。任意比例必须满足下方的尺寸约束。

  也可以传 `auto` 让上游自动选择尺寸，但最终宽高比和像素尺寸无法保证。
</ParamField>

<ParamField body="resolution" type="string" default="1k">
  输出分辨率档位

  支持值：`1k`、`2k`、`4k`
</ParamField>

### 任意分辨率

除上述预设比例外，可以通过 `size` 的 `宽:高` 格式请求任意比例。服务端会根据 `resolution` 档位计算实际像素尺寸。请求的宽高必须满足：

* 宽和高都必须是 16 像素的倍数
* 长边最大可达 3,840 像素（4K）
* 宽高比最大可达 3:1
* 像素总数范围为 655,360–8,294,400

例如：

* `size: "1:3"`、`resolution: "2k"` → `1024x3072`
* `size: "7:4"`、`resolution: "1k"` → `1344x768`

```bash theme={null}
curl --request POST \
  --url https://toapis.com/v1/images/generations \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "gpt-image-2-vip",
    "prompt": "白色背景上的红色圆形，简洁测试图",
    "size": "1:3",
    "resolution": "2k",
    "quality": "medium",
    "n": 1
  }'
```

<ParamField body="quality" type="string" default="medium">
  图片质量

  * `low` — 快速省钱，适合草稿/预览
  * `medium` — 平衡速度与质量
  * `high` — 最高精度，适合正式出图
</ParamField>

<ParamField body="background" type="string" default="auto">
  生成图像的背景样式

  * `auto` — 由模型自动决定（默认）
  * `transparent` — 透明背景
  * `opaque` — 不透明背景

  <Note>透明背景建议搭配 PNG 输出使用。</Note>
</ParamField>

<ParamField body="n" type="integer" default={1}>
  生成图像的数量

  默认：1
</ParamField>

<ParamField body="response_format" type="string" default="url">
  返回格式

  固定返回图片 URL，推荐使用 `url`
</ParamField>

<ParamField body="reference_images" type="string[]">
  参考图 URL 列表，用于图生图

  **⚠️ 仅支持 URL 格式（不再支持 base64）**

  * 公开可访问的图片 URL（http\:// 或 https\://）
  * 可使用 [上传图片接口](../../uploads/images) 上传本地图片获取 URL
  * 支持单图和多图参考
</ParamField>

<ParamField body="image_urls" type="string[]">
  向后兼容的参考图字段

  在 ToAPIs 中会自动归一化为 `reference_images`
</ParamField>

<ParamField body="callback_url" type="string">
  ToAPIs 标准任务完成回调。需先为 Token 配置默认 HTTPS 地址和签名密钥；请求级地址只能同源覆盖。详见 [任务 Webhook](/docs/cn/api-reference/webhooks/task-webhooks)。
</ParamField>

## Response

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

<RequestExample>
  ```bash cURL theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "gpt-image-2-vip",
      "prompt": "生成一张横版电影海报，未来城市夜景，霓虹灯，电影感构图",
      "n": 1,
      "size": "16:9",
      "resolution": "2k",
      "quality": "high",
      "response_format": "url"
    }'
  ```

  ```bash cURL (图生图) theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "gpt-image-2-vip",
      "prompt": "保留主体结构，把画面改成赛博朋克风格，增强光影和细节",
      "n": 1,
      "size": "9:16",
      "resolution": "4k",
      "quality": "medium",
      "image_urls": [
        "https://example.com/source.png",
        "https://example.com/source.png"
      ],
      "response_format": "url"
    }'
  ```

  ```javascript JavaScript theme={null}
  const response = await fetch('https://toapis.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-ToAPIs-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-2-vip',
      prompt: 'Generate a cinematic widescreen poster of a futuristic neon city at night',
      n: 1,
      size: '16:9',
      resolution: '2k',
      quality: 'low',
      response_format: 'url'
    })
  });

  const task = await response.json();
  console.log(task.id, task.status);
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={null}
  {
    "id": "task_img_abc123def456",
    "object": "generation.task",
    "model": "gpt-image-2-vip",
    "status": "queued",
    "progress": 0,
    "created_at": 1703884800,
    "metadata": {}
  }
  ```
</ResponseExample>
