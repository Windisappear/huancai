> ## Documentation Index
> Fetch the complete documentation index at: https://docs.toapis.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Seedream-5.0-Pro 图像生成

> 使用 Seedream 5.0 Pro 模型生成高质量图像，支持 1K/2K 分辨率

<Note>
  **国内用户请注意：** 中国大陆用户请使用 `https://toapis.cn` 作为接口地址（Base URL）。文档示例中的 `https://toapis.com` 请替换为 `https://toapis.cn`。
</Note>

* Seedream 5.0 Pro 高质量图像生成模型，由字节跳动 Seed 团队研发
* 通过 model 参数选择 `doubao-seedream-5-0-pro` 模型
* 参数与 `Seedream-5.0` 基本一致，区别在于 Pro 支持 **1K** 和 **2K** 分辨率
* 支持文生图、图生图、多图参考等生成模式
* **计费规则**：首张参考图免费，从第 2 张参考图开始按正常规则计费
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

<ParamField body="model" type="string" default="doubao-seedream-5-0-pro" required>
  图像生成模型名称

  示例：`"doubao-seedream-5-0-pro"`
</ParamField>

<ParamField body="prompt" type="string" required>
  图像生成的文本描述
</ParamField>

<ParamField body="size" type="string" default="1:1">
  图像宽高比

  启用 `layer_decomposition` 时，该字段改为直接传入分辨率预设 `1K` 或 `2K`。

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

  范围：1-10（最少 1 张，最多 10 张）

  默认：1

  **注意：**

  * 参考图像 + 生成图像总数必须 ≤ 15
  * **必须输入纯数字（如 `1`），不要加引号，否则会报错**

  会根据生成数量和参考图数量进行预扣费，其中首张参考图免费
</ParamField>

<ParamField body="layer_decomposition" type="boolean" default={false}>
  是否启用 Seedream 5.0 Pro 专属的图层拆分能力。

  * `false`：返回普通的扁平图像（默认）
  * `true`：返回底图和多个带透明通道的独立 PNG 图层

  开启后，任务查询结果的每个 `result.data[]` 项还会返回 `z_index`；独立图层会额外返回 `bounding_box`、`name` 和 `description`。该参数仅支持 Seedream 5.0 Pro。
</ParamField>

<ParamField body="image_urls" type="string[]">
  参考图像 URL 列表，用于图生图或图像编辑

  **⚠️ 仅支持 URL 格式（不再支持 base64）**

  * 公开可访问的图像 URL（http\:// 或 https\://）
  * 可使用 [上传图片接口](../../uploads/images) 上传本地图片获取 URL

  **限制：**

  * 图片数量：1-10 张
  * 图像格式：jpeg, png
  * 宽高比（宽/高）范围：\[1/3, 3]
  * 宽度和高度（px）> 14
  * 大小：不超过 10MB
  * 总像素：不超过 6000×6000 px

  **计费说明：**

  * 首张参考图免费
  * 从第 2 张参考图开始按正常规则计费
</ParamField>

<ParamField body="metadata" type="object">
  渠道特有参数，用于传递 Seedream 5.0 Pro 模型的高级配置

  <Expandable title="metadata 属性">
    <ParamField body="metadata.resolution" type="string" default="2K">
      图像分辨率

      支持的分辨率：

      * `1K` - 基础分辨率
      * `2K` - 标准分辨率（默认）

      > **注意：** Seedream 5.0 Pro 不支持 3K 和 4K 分辨率；非 Pro 的 Seedream 5.0 支持 2K 和 3K
    </ParamField>

    <ParamField body="metadata.sequential_image_generation" type="string" default="disabled">
      顺序图像生成模式（豆包专属功能）

      控制是否生成多张图像：

      * `disabled`：禁用顺序模式，即使有多张参考图像也只生成 1 张（默认）
      * `auto`：启用顺序模式，可以生成多张图像

      **使用说明：**

      * ✅ 设置 `n: 3` 或使用 `sequential_image_generation: "auto"` + `max_images: 3`
      * ✅ 支持文生组图：仅提供文本提示词，最多生成 10 张图像
      * ✅ 支持图生图/图生组图：提供 `image_urls`，基于参考图像生成多张图像
      * ⚠️ 当 `n > 1` 时，会自动设置为 `auto`

      **注意：**

      * 输入的参考图数量 + 最终生成图片数量 ≤ 15 张
    </ParamField>

    <ParamField body="metadata.sequential_image_generation_options" type="object">
      顺序图像生成选项

      当 `sequential_image_generation` 设置为 `auto` 时可用

      **属性：**

      * `max_images`（整数）：指定生成的图像数量，范围：1-10

      **示例：**

      ```json theme={null}
      "sequential_image_generation_options": { "max_images": 3 }
      ```
    </ParamField>

    <ParamField body="metadata.watermark" type="boolean" default={false}>
      是否为生成的图像添加水印

      * `true`：添加水印
      * `false`：不添加水印（默认）
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

<ResponseField name="completed_at" type="integer">
  任务完成时间戳（Unix 时间戳）。仅在任务完成后返回。
</ResponseField>

<ResponseField name="expires_at" type="integer">
  结果文件的过期时间戳（Unix 时间戳）。请在过期前下载或转存结果文件。
</ResponseField>

<ResponseField name="result" type="object">
  任务成功后的生成结果。仅当 `status` 为 `completed` 时返回。
</ResponseField>

<ResponseField name="result.type" type="string">
  结果类型，图片任务固定为 `image`。
</ResponseField>

<ResponseField name="result.data" type="array">
  图片结果列表。开启图层拆分时，第一个元素通常为底图，其余元素为带透明通道的独立 PNG 图层。
</ResponseField>

<ResponseField name="result.data[].url" type="string">
  底图或独立图层的公开访问地址。
</ResponseField>

<ResponseField name="result.data[].z_index" type="integer">
  图层叠放顺序。开启 `layer_decomposition` 时，底图通常为 `0`，独立图层依次递增。
</ResponseField>

<ResponseField name="result.data[].size" type="string">
  当前底图或独立图层的像素尺寸，例如 `2048x2048`。
</ResponseField>

<ResponseField name="result.data[].output_format" type="string">
  当前结果项的文件格式。底图可为请求的格式，透明独立图层为 `png`。
</ResponseField>

<ResponseField name="result.data[].bounding_box" type="object">
  独立图层在底图中的位置，包含 `absolute` 绝对坐标和 `normalized` 归一化坐标。
</ResponseField>

<ResponseField name="result.data[].bounding_box.absolute" type="array">
  图层在底图中的绝对像素坐标，格式为 `[x1, y1, x2, y2]`，分别表示左上角和右下角坐标。
</ResponseField>

<ResponseField name="result.data[].bounding_box.normalized" type="array">
  图层的归一化坐标，格式为 `[x1, y1, x2, y2]`，坐标范围为 `0-1000`。
</ResponseField>

<ResponseField name="result.data[].name" type="string">
  图层名称。
</ResponseField>

<ResponseField name="result.data[].description" type="string">
  图层内容描述。
</ResponseField>

<RequestExample>
  ```bash cURL theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "doubao-seedream-5-0-pro",
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
      "model": "doubao-seedream-5-0-pro",
      "prompt": "可爱的熊猫在竹林中玩耍",
      "size": "1:1",
      "n": 1,
      "image_urls": [
        "https://example.com/panda.jpg"
      ],
      "metadata": {
        "resolution": "1K"
      }
    }'
  ```

  ```bash cURL (图层拆分) theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "doubao-seedream-5-0-pro",
      "prompt": "将图片进行精确图层分离，返回底图和多个独立透明 PNG 图层。",
      "image_urls": [
        "https://example.com/office-desk.png"
      ],
      "size": "2K",
      "n": 1,
      "layer_decomposition": true
    }'
  ```

  <Note>
    启用 `layer_decomposition` 时，`size` 请直接使用 `1K` 或 `2K` 分辨率预设，不要使用 `WIDTHxHEIGHT` 显式像素尺寸。提交成功后，通过 `GET /v1/images/generations/{task_id}` 查询完整图层结果。
  </Note>

  ```bash cURL (组图) theme={null}
  curl --request POST \
    --url https://toapis.com/v1/images/generations \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "doubao-seedream-5-0-pro",
      "prompt": "可爱的熊猫在竹林中玩耍",
      "size": "1:1",
      "n": 4,
      "metadata": {
        "resolution": "2K",
        "sequential_image_generation": "auto",
        "sequential_image_generation_options": { "max_images": 4 },
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
          "model": "doubao-seedream-5-0-pro",
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
          "model": "doubao-seedream-5-0-pro",
          "prompt": "可爱的熊猫在竹林中玩耍",
          "size": "1:1",
          "n": 1,
          "image_urls": ["https://example.com/panda.jpg"],
          "metadata": {
              "resolution": "1K"
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
      model: 'doubao-seedream-5-0-pro',
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
      model: 'doubao-seedream-5-0-pro',
      prompt: '可爱的熊猫在竹林中玩耍',
      size: '1:1',
      n: 1,
      image_urls: ['https://example.com/panda.jpg'],
      metadata: {
        resolution: '1K'
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
    "model": "doubao-seedream-5-0-pro",
    "status": "queued",
    "progress": 0,
    "created_at": 1703884800,
    "metadata": {}
  }
  ```

  ```json 200 图层拆分完成 theme={null}
  {
    "completed_at": 1787128810,
    "created_at": 1787128650,
    "expires_at": 1787215210,
    "id": "tsk_img_example_layer_decomposition",
    "model": "doubao-seedream-5-0-pro",
    "object": "generation.task",
    "progress": 100,
    "result": {
      "type": "image",
      "data": [
        {
          "url": "https://files.toapis.com/images/example/base.jpg",
          "size": "1600x2848",
          "output_format": "jpeg",
          "z_index": 0
        },
        {
          "url": "https://files.toapis.com/images/example/layer-1.png",
          "size": "3040x955",
          "output_format": "png",
          "z_index": 1,
          "bounding_box": {
            "absolute": [0, 0, 1600, 503],
            "normalized": [0, 0, 999, 176]
          },
          "name": "背景办公设备组",
          "description": "提取画面背景的显示器边缘和文件收纳架，无多余内容"
        },
        {
          "url": "https://files.toapis.com/images/example/layer-2.png",
          "size": "1982x1162",
          "output_format": "png",
          "z_index": 2,
          "bounding_box": {
            "absolute": [800, 589, 1599, 1058],
            "normalized": [500, 207, 999, 371]
          },
          "name": "堆叠白色纸张",
          "description": "提取桌面上堆叠的数张白色办公纸张，无多余内容"
        }
      ]
    },
    "status": "completed"
  }
  ```
</ResponseExample>
