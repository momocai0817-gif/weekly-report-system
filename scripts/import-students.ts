/**
 * 导入学生数据到Supabase
 * 使用方法：在配置好.env.local后运行
 * npx ts-node scripts/import-students.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// 加载 .env.local 文件
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('请先配置 .env.local 文件中的 Supabase 凭证')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 完整的学生数据（从区队名单Excel中提取）
const allStudents = [
  // 一区队 (40人)
  { name: '王勇杰', student_id: '230030101', squad: '一区队', advisor: '朱佳青' },
  { name: '王梓', student_id: '230030102', squad: '一区队', advisor: '赵蔚' },
  { name: '邢天成', student_id: '230030103', squad: '一区队', advisor: '崔磊' },
  { name: '朱弈帆', student_id: '230030104', squad: '一区队', advisor: '朱佳青' },
  { name: '朱翊豪', student_id: '230030105', squad: '一区队', advisor: '周琦' },
  { name: '严叶', student_id: '230030106', squad: '一区队', advisor: '朱佳青' },
  { name: '劳钰祥', student_id: '230030107', squad: '一区队', advisor: '金佳雯' },
  { name: '李臻鋆', student_id: '230030108', squad: '一区队', advisor: '陈晨' },
  { name: '吴羽祥', student_id: '230030109', squad: '一区队', advisor: '赵蔚' },
  { name: '沈君一', student_id: '230030110', squad: '一区队', advisor: '待定' }, // 无导师，可能是已退学
  { name: '张俊凯', student_id: '230030111', squad: '一区队', advisor: '陈晨' },
  { name: '张海晖', student_id: '230030112', squad: '一区队', advisor: '宣卿文' },
  { name: '张琪', student_id: '230030113', squad: '一区队', advisor: '杨成毅' },
  { name: '陈一飞', student_id: '230030114', squad: '一区队', advisor: '宣卿文' },
  { name: '陈子鸣', student_id: '230030115', squad: '一区队', advisor: '宣卿文' },
  { name: '陈致远', student_id: '230030116', squad: '一区队', advisor: '杨成毅' },
  { name: '陈梓杨', student_id: '230030117', squad: '一区队', advisor: '赵蔚' },
  { name: '范隽琦', student_id: '230030118', squad: '一区队', advisor: '李宇恒' },
  { name: '范家炜', student_id: '230030119', squad: '一区队', advisor: '秦飞' },
  { name: '林曹聪', student_id: '230030120', squad: '一区队', advisor: '金佳雯' },
  { name: '周令翀', student_id: '230030121', squad: '一区队', advisor: '薛君' },
  { name: '周晓军', student_id: '230030122', squad: '一区队', advisor: '周琦' },
  { name: '姜樾', student_id: '230030123', squad: '一区队', advisor: '左欣品' },
  { name: '袁姜辰奕', student_id: '230030124', squad: '一区队', advisor: '杨成毅' },
  { name: '聂奕轩', student_id: '230030125', squad: '一区队', advisor: '杨成毅' },
  { name: '顾天扬', student_id: '230030126', squad: '一区队', advisor: '陈晨' },
  { name: '顾宇阳', student_id: '230030127', squad: '一区队', advisor: '宣卿文' },
  { name: '徐金伟', student_id: '230030128', squad: '一区队', advisor: '崔磊' },
  { name: '唐家豪', student_id: '230030129', squad: '一区队', advisor: '杨成毅' },
  { name: '唐勘捷', student_id: '230030130', squad: '一区队', advisor: '蒋唯' },
  { name: '谈家涛', student_id: '230030131', squad: '一区队', advisor: '金佳雯' },
  { name: '黄俊絜', student_id: '230030132', squad: '一区队', advisor: '杨成毅' },
  { name: '盛昀州', student_id: '230030133', squad: '一区队', advisor: '朱佳青' },
  { name: '彭家昕', student_id: '230030134', squad: '一区队', advisor: '李雷' },
  { name: '程奕', student_id: '230030135', squad: '一区队', advisor: '赵蔚' },
  { name: '蔡祎伟', student_id: '230030136', squad: '一区队', advisor: '宣卿文' },
  { name: '史逸敏', student_id: '230030137', squad: '一区队', advisor: '陈晨' },
  { name: '何佳琪', student_id: '230030138', squad: '一区队', advisor: '李宇恒' },
  { name: '金雨汲', student_id: '230030139', squad: '一区队', advisor: '陈晨' },
  { name: '廖欣愿', student_id: '230030140', squad: '一区队', advisor: '金佳雯' },

  // 二区队 (40人)
  { name: '石浩然', student_id: '230030201', squad: '二区队', advisor: '秦飞' },
  { name: '吉茗轩', student_id: '230030202', squad: '二区队', advisor: '薛君' },
  { name: '朱瑞鹏', student_id: '230030203', squad: '二区队', advisor: '崔磊' },
  { name: '刘元馨', student_id: '230030204', squad: '二区队', advisor: '蒋唯' },
  { name: '孙俊文', student_id: '230030205', squad: '二区队', advisor: '左欣品' },
  { name: '李张钧', student_id: '230030206', squad: '二区队', advisor: '左欣品' },
  { name: '吴泽斌', student_id: '230030207', squad: '二区队', advisor: '杨易' },
  { name: '汪致德', student_id: '230030208', squad: '二区队', advisor: '杨易' },
  { name: '汪逸凡', student_id: '230030209', squad: '二区队', advisor: '薛君' },
  { name: '张唯一', student_id: '230030210', squad: '二区队', advisor: '朱佳青' },
  { name: '陆祺申', student_id: '230030211', squad: '二区队', advisor: '赵蔚' },
  { name: '陈文博', student_id: '230030212', squad: '二区队', advisor: '金佳雯' },
  { name: '陈焰霄', student_id: '230030213', squad: '二区队', advisor: '李宇恒' },
  { name: '范修丞', student_id: '230030214', squad: '二区队', advisor: '薛君' },
  { name: '易王炎冉', student_id: '230030215', squad: '二区队', advisor: '周琦' },
  { name: '金奕帆', student_id: '230030216', squad: '二区队', advisor: '左欣品' },
  { name: '郑君涵', student_id: '230030217', squad: '二区队', advisor: '曹仁霞' },
  { name: '胡凌森', student_id: '230030218', squad: '二区队', advisor: '顾文彦' },
  { name: '俞子昂', student_id: '230030219', squad: '二区队', advisor: '曹仁霞' },
  { name: '夏博', student_id: '230030220', squad: '二区队', advisor: '刘兵兵' },
  { name: '顾一鸣', student_id: '230030221', squad: '二区队', advisor: '李宇恒' },
  { name: '顾嘉程', student_id: '230030222', squad: '二区队', advisor: '李雷' },
  { name: '徐天翼', student_id: '230030223', squad: '二区队', advisor: '李雷' },
  { name: '徐裴', student_id: '230030224', squad: '二区队', advisor: '李雷' },
  { name: '郭宇', student_id: '230030225', squad: '二区队', advisor: '薛君' },
  { name: '唐陆阳', student_id: '230030226', squad: '二区队', advisor: '周琦' },
  { name: '陶鸢飞', student_id: '230030227', squad: '二区队', advisor: '王丽君' },
  { name: '黄尊', student_id: '230030228', squad: '二区队', advisor: '朱佳青' },
  { name: '曹沂', student_id: '230030229', squad: '二区队', advisor: '李宇恒' },
  { name: '梁海东', student_id: '230030230', squad: '二区队', advisor: '陈晨' },
  { name: '储嘉浩', student_id: '230030231', squad: '二区队', advisor: '杨易' },
  { name: '童卓洵', student_id: '230030232', squad: '二区队', advisor: '刘兵兵' },
  { name: '游景明', student_id: '230030233', squad: '二区队', advisor: '刘兵兵' },
  { name: '褚凯昕', student_id: '230030234', squad: '二区队', advisor: '周琦' },
  { name: '褚轶男', student_id: '230030235', squad: '二区队', advisor: '陈晨' },
  { name: '瞿家乐', student_id: '230030236', squad: '二区队', advisor: '左欣品' },
  { name: '杨淏文', student_id: '230030237', squad: '二区队', advisor: '李宇恒' },
  { name: '张睿涵', student_id: '230030238', squad: '二区队', advisor: '薛君' },
  { name: '盛怡云', student_id: '230030239', squad: '二区队', advisor: '刘兵兵' },
  { name: '程馨源', student_id: '230030240', squad: '二区队', advisor: '金佳雯' },
]

async function importStudents() {
  console.log(`开始导入 ${allStudents.length} 名学生数据...\n`)

  // 先清空现有数据
  console.log('清空现有学生数据...')
  const { error: deleteError } = await supabase
    .from('students')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError && deleteError.code !== 'PGRST116') {
    console.error('清空数据失败:', deleteError.message)
  } else {
    console.log('✓ 已清空现有数据\n')
  }

  let successCount = 0
  let errorCount = 0

  for (const student of allStudents) {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert(student)
        .select()

      if (error) {
        console.error(`✗ ${student.name} - ${error.message}`)
        errorCount++
      } else {
        console.log(`✓ ${student.name} (${student.student_id}) - ${student.advisor}`)
        successCount++
      }
    } catch (err) {
      console.error(`✗ 异常: ${student.name} -`, err)
      errorCount++
    }
  }

  console.log(`\n导入完成！`)
  console.log(`成功: ${successCount} 条`)
  console.log(`错误: ${errorCount} 条`)
}

importStudents().catch(console.error)
