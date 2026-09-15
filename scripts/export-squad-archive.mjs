/**
 * 导出指定周/区队的已交名单 + 签名 zip（走 /api/admin/archive/export-all 标准导出，
 * 格式与本机每周生成的一致：总表 + 按导师分 sheet + 全部问题列）
 *
 * 用法: node scripts/export-squad-archive.mjs <week> <year> <squad>
 * 依赖: weekly-report 应用在 localhost:6010 运行中
 * 输出: /root/exports/<年>-W<周>-<区队>/ 下三个文件：
 *       第<周>周_<区队>_已交名单.xlsx / 签名_第<周>周_<区队>.zip / 第<周>周_全部归档_<年>年.zip
 *       前两个同时存 storage/archives/<年>/<周>/ 供 /api/archive/... 在线下载
 */
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import JSZip from 'jszip'

const [week, year, squad] = [process.argv[2], process.argv[3], process.argv[4]]
if (!week || !year || !squad) {
  console.error('用法: node scripts/export-squad-archive.mjs <week> <year> <squad>')
  process.exit(1)
}

const res = await fetch(
  `http://localhost:6010/api/admin/archive/export-all?week=${week}&year=${year}`,
)
if (!res.ok) {
  console.error(`export-all 接口失败: ${res.status}`, await res.text())
  process.exit(1)
}
const fullZip = await JSZip.loadAsync(await res.arrayBuffer())

const squadXlsx = fullZip.file(`${squad}/${squad}_已交名单_第${week}周.xlsx`)
if (!squadXlsx) {
  console.error(`归档包里没找到 ${squad}/ 已交名单，包内文件：`)
  console.error(Object.keys(fullZip.files).join('\n'))
  process.exit(1)
}

// 从全量签名包抽出该区队（保留 区队名/ 文件夹结构）
const sigZip = new JSZip()
const signaturesEntry = Object.keys(fullZip.files).find((n) => n.startsWith(`签名_第${week}周.zip`))
if (signaturesEntry) {
  const innerZip = await JSZip.loadAsync(await fullZip.file(signaturesEntry).async('arraybuffer'))
  for (const [name, file] of Object.entries(innerZip.files)) {
    if (!file.dir && name.startsWith(`${squad}/`)) {
      sigZip.file(name, await file.async('nodebuffer'))
    }
  }
}
const sigBuffer = await sigZip.generateAsync({ type: 'nodebuffer' })
const fullBuffer = await fullZip.generateAsync({ type: 'nodebuffer' })

const exportDir = `/root/exports/${year}-W${week}-${squad}`
const storageDir = path.join(process.cwd(), 'storage', 'archives', String(year), String(week))
for (const dir of [exportDir, storageDir]) mkdirSync(dir, { recursive: true })

const xlsxName = `第${week}周_${squad}_已交名单.xlsx`
const sigName = `签名_第${week}周_${squad}.zip`
const fullName = `第${week}周_全部归档_${year}年.zip`
const xlsxBuffer = await squadXlsx.async('nodebuffer')

writeFileSync(path.join(exportDir, xlsxName), xlsxBuffer)
writeFileSync(path.join(exportDir, sigName), sigBuffer)
writeFileSync(path.join(exportDir, fullName), fullBuffer)
writeFileSync(path.join(storageDir, xlsxName), xlsxBuffer)
writeFileSync(path.join(storageDir, sigName), sigBuffer)

console.log(`完成：${exportDir}/ 下 ${xlsxName}、${sigName}、${fullName}`)
console.log(`在线下载: /api/archive/${year}/${week}/${encodeURIComponent(xlsxName)}`)
console.log(`          /api/archive/${year}/${week}/${encodeURIComponent(sigName)}`)
