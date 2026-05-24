type ZipEntry = {
  name: string
  data: Blob | Uint8Array
}

const textEncoder = new TextEncoder()

function makeCrcTable() {
  const table = new Uint32Array(256)

  for (let index = 0; index < table.length; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
}

const crcTable = makeCrcTable()

function crc32(data: Uint8Array) {
  let crc = 0xffffffff

  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true)
}

function dosDateTime(date = new Date()) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2)
  const dosDate =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate()

  return { dosDate, time }
}

async function toBytes(data: Blob | Uint8Array) {
  if (data instanceof Uint8Array) {
    return data
  }

  return new Uint8Array(await data.arrayBuffer())
}

export async function createZip(entries: ZipEntry[]) {
  const files = await Promise.all(
    entries.map(async (entry) => ({
      nameBytes: textEncoder.encode(entry.name),
      data: await toBytes(entry.data),
    }))
  )
  const { dosDate, time } = dosDateTime()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const crc = crc32(file.data)
    const localHeader = new Uint8Array(30 + file.nameBytes.length)
    const localView = new DataView(localHeader.buffer)

    writeUint32(localView, 0, 0x04034b50)
    writeUint16(localView, 4, 20)
    writeUint16(localView, 6, 0)
    writeUint16(localView, 8, 0)
    writeUint16(localView, 10, time)
    writeUint16(localView, 12, dosDate)
    writeUint32(localView, 14, crc)
    writeUint32(localView, 18, file.data.length)
    writeUint32(localView, 22, file.data.length)
    writeUint16(localView, 26, file.nameBytes.length)
    localHeader.set(file.nameBytes, 30)
    localParts.push(localHeader, file.data)

    const centralHeader = new Uint8Array(46 + file.nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)

    writeUint32(centralView, 0, 0x02014b50)
    writeUint16(centralView, 4, 20)
    writeUint16(centralView, 6, 20)
    writeUint16(centralView, 8, 0)
    writeUint16(centralView, 10, 0)
    writeUint16(centralView, 12, time)
    writeUint16(centralView, 14, dosDate)
    writeUint32(centralView, 16, crc)
    writeUint32(centralView, 20, file.data.length)
    writeUint32(centralView, 24, file.data.length)
    writeUint16(centralView, 28, file.nameBytes.length)
    writeUint32(centralView, 42, offset)
    centralHeader.set(file.nameBytes, 46)
    centralParts.push(centralHeader)

    offset += localHeader.length + file.data.length
  }

  const centralSize = centralParts.reduce((size, part) => size + part.length, 0)
  const endHeader = new Uint8Array(22)
  const endView = new DataView(endHeader.buffer)

  writeUint32(endView, 0, 0x06054b50)
  writeUint16(endView, 8, files.length)
  writeUint16(endView, 10, files.length)
  writeUint32(endView, 12, centralSize)
  writeUint32(endView, 16, offset)

  return new Blob([...localParts, ...centralParts, endHeader], {
    type: "application/zip",
  })
}
