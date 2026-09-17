> ## Documentation Index
> Fetch the complete documentation index at: https://docs.toapis.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Seedream-4.5 图像生成

> 使用 Seedream 4.5 模型生成高质量图像，最新版本

<Note>
  **国内用户请注意：** 中国大陆用户请使用 `https://toapis.cn` 作为接口地址（Base URL）。文档示例中的 `https://toapis.com` 请替换为 `https://toapis.cn`。
</Note>

* Seedream 4.5 最新高质量图像生成模型
* 通过 model 参数选择 `doubao-seedream-4-5` 模型
* 支持文本到图像生成，画质更优
* 异步任务管理，通过任务 ID 查询结果

<Warning>
  **重要变更**：为了更好的性能和成本控制，我们不再支持在 `image_urls` 中直接传入 base64 图片数据。请先使用 [上传图片接口](../../uploads/images) 上传图片，获取 URL 后再调用本接口。
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

<ParamField body="model" type="string" default="doubao-seedream-4-5" required>
  图像生成模型名称

  示例：`"doubao-seedream-4-5"`
</ParamField>

<ParamField body="prompt" type="string" required>
  图像生成的文本描述
</ParamField>

<ParamField body="size" type="string" default="1:1">
  图像宽高比

  支持的宽高比：

  * `1:1` - 正方形（默认）
  * `4:3` - 横向 4:3
  * `3:4` - 竖向 3:4
  * `16:9` - 横向宽屏
  * `9:16` - 竖向长图
  * `3:2` - 横向 3:2
  * `2:3` - 竖向 2:3
  * `21:9` - 超宽屏
  * `9:21` - 超窄屏
</ParamField>

<ParamField body="n" type="integer" default={1}>
  生成图像的数量

  范围：1-15（最少 1 张，最多 15 张）

  默认：1

  **注意：**

  * 实际可生成的图像数量受此参数和输入参考图像数量共同影响。参考图像 + 生成图像总数必须 ≤ 15
  * **必须输入纯数字（如 `1`），不要加引号，否则会报错**

  会根据生成数量进行预扣费
</ParamField>

<ParamField body="image_urls" type="string[]">
  参考图像 URL 列表，用于图生图或图像编辑

  **⚠️ 仅支持 URL 格式（不再支持 base64）**

  * 公开可访问的图像 URL（http\:// 或 https\://）
  * 可使用 [上传图片接口](../../uploads/images) 上传本地图片获取 URL

  **限制：**

  * 最多 10 张图片
  * 图像格式：jpeg, png
  * 宽高比（宽/高）范围：\[1/3, 3]
  * 宽度和高度（px）> 14
  * 大小：不超过 10MB
  * 总像素：不超过 6000×6000 px
</ParamField>

<ParamField body="metadata" type="object">
  渠道特有参数，用于传递 Seedream 4.5 模型的高级配置

  <Expandable title="metadata 属性">
    <ParamField body="metadata.resolution" type="string" default="2K">
      图像分辨率

      支持的分辨率：

      * `2K` - 标准分辨率（默认）
      * `4K` - 高清分辨率

      > **注意：** Seedream-4.5 不支持 1K 分辨率

      **分辨率参考尺寸：**

      | 分辨率 | 1:1 尺寸    | 16:9 尺寸   |
      | --- | --------- | --------- |
      | 2K  | 2048x2048 | 2560x1440 |
      | 4K  | 4096x4096 | 5404x3040 |
    </ParamField>

    <ParamField body="metadata.optimize_prompt_options" type="object">
      提示词优化选项

      **属性：**

      * `mode`（字符串）：优化模式
        * `standard`：标准模式，生成质量更高，处理时间更长（默认）
        * `fast`：快速模式，处理时间更短，质量一般

      **示例：**

      ```json theme={null}
      "optimize_prompt_options": { "mode": "standard" }
      ```
    </ParamField>

    <ParamField body="metadata.sequential_image_generation" type="string" default="disabled">
      顺序图像生成模式（豆包专属功能）

      控制是否生成多张图像：

      * `disabled`：禁用顺序模式，即使有多张参考图像也只生成 1 张（默认）
      * `auto`：启用顺序模式，可以生成多张图像

      **使用说明：**

      * ✅ 设置 `n: 3` 或使用 `sequential_image_generation: "auto"` + `max_images: 3`
      * ✅ 支持文生图：仅提供文本提示词，最多生成 15 张图像
      * ✅ 支持图生图：提供 `image_urls`，基于参考图像生成多张图像
      * ⚠️ 当 `n > 1` 时，会自动设置为 `auto`

      **注意：**

      * 输入的参考图数量 + 最终生成图片数量 ≤ 15 张
    </ParamField>

    <ParamField body="metadata.sequential_image_generation_options" type="object">
      顺序图像生成选项

      当 `sequential_image_generation` 设置为 `auto` 时可用

      **属性：**

      * `max_images`（整数）：指定生成的图像数量，范围：1-15

      **示例：**

      ```json theme={null}
      "sequential_image_generation_options": { "max_images": 3 }
      ```
    </ParamField>

    <ParamField body="metadata.watermark" type="boolean" default={true}>
      是否为生成的图像添加水印

      * `true`：添加水印（默认）
      * `false`：不添加水印
    </ParamField>
  </Expandable>
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
      "model": "doubao-seedream-4-5",
      "prompt": "可爱的熊猫在竹林中玩耍",
      "size": "1:1",
      "n": 1,
      "metadata": {
        "resolution": "2K"
      }
    }'
  ```

  ```bash cURL (图生图) theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "doubao-seedream-4-5",
      "prompt": "可爱的熊猫在竹林中玩耍",
      "size": "1:1",
      "n": 1,
      "image_urls": [
        "https://example.com/panda.jpg"
      ],
      "metadata": {
        "resolution": "2K"
      }
    }'
  ```

  ```bash cURL (高级功能) theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "doubao-seedream-4-5",
      "prompt": "可爱的熊猫在竹林中玩耍",
      "size": "1:1",
      "n": 3,
      "image_urls": [
        "https://example.com/panda.jpg"
      ],
      "metadata": {
        "resolution": "4K",
        "optimize_prompt_options": { "mode": "standard" },
        "sequential_image_generation": "auto",
        "sequential_image_generation_options": { "max_images": 3 },
        "watermark": false
      }
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
          "model": "doubao-seedream-4-5",
          "prompt": "可爱的熊猫在竹林中玩耍",
          "size": "1:1",
          "n": 1,
          "metadata": {
              "resolution": "2K"
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
          "model": "doubao-seedream-4-5",
          "prompt": "可爱的熊猫在竹林中玩耍",
          "size": "1:1",
          "n": 1,
          "image_urls": ["https://example.com/panda.jpg"],
          "metadata": {
              "resolution": "2K"
          }
      }
  )

  task = response.json()
  print(f"任务 ID: {task['id']}")
  print(f"状态: {task['status']}")
  ```

  ```python Python (高级功能) theme={null}
  import requests

  response = requests.post(
      "https://toapis.com/v1/images/generations",
      headers={
          "Authorization": "Bearer your-ToAPIs-key",
          "Content-Type": "application/json"
      },
      json={
          "model": "doubao-seedream-4-5",
          "prompt": "可爱的熊猫在竹林中玩耍",
          "size": "1:1",
          "n": 3,
          "image_urls": ["https://example.com/panda.jpg"],
          "metadata": {
              "resolution": "4K",
              "optimize_prompt_options": {"mode": "standard"},
              "sequential_image_generation": "auto",
              "sequential_image_generation_options": {"max_images": 3},
              "watermark": False
          }
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
      model: 'doubao-seedream-4-5',
      prompt: '可爱的熊猫在竹林中玩耍',
      size: '1:1',
      n: 1,
      metadata: {
        resolution: '2K'
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
      model: 'doubao-seedream-4-5',
      prompt: '可爱的熊猫在竹林中玩耍',
      size: '1:1',
      n: 1,
      image_urls: ['https://example.com/panda.jpg'],
      metadata: {
        resolution: '2K'
      }
    })
  });

  const task = await response.json();
  console.log(`任务 ID: ${task.id}`);
  console.log(`状态: ${task.status}`);
  ```

  ```javascript JavaScript (高级功能) theme={null}
  const response = await fetch('https://toapis.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-ToAPIs-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'doubao-seedream-4-5',
      prompt: '可爱的熊猫在竹林中玩耍',
      size: '1:1',
      n: 3,
      image_urls: ['https://example.com/panda.jpg'],
      metadata: {
        resolution: '4K',
        optimize_prompt_options: { mode: 'standard' },
        sequential_image_generation: 'auto',
        sequential_image_generation_options: { max_images: 3 },
        watermark: false
      }
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
     "model": "doubao-seedream-4-5",
    "status": "queued",
    "progress": 0,
    "created_at": 1703884800,
    "metadata": {}
  }
  ```
</ResponseExample>
