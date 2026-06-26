import type { CommitmentKey } from '@/types'

// مفاتيح الالتزام — مبادئ بسيطة تذكّر الشخص بالأهم كل يوم.
export const commitmentKeys: CommitmentKey[] = [
  {
    icon: 'Droplets',
    title: 'اشرب ماءك',
    description: 'هدفك 3 لترات يوميًا — ابدأ يومك بكوب وخلّ القزاز قريب منك.',
  },
  {
    icon: 'Moon',
    title: 'نَم زين',
    description: '7–8 ساعات نوم. الاستشفاء جزء من التمرين، مو رفاهية.',
  },
  {
    icon: 'Dumbbell',
    title: 'لا تفوّت التمرين',
    description: 'حتى لو تمرين خفيف — الاستمرار أهم من الشدّة.',
  },
  {
    icon: 'Salad',
    title: 'بروتين كل وجبة',
    description: 'خلّ البروتين أساس صحنك عشان توصل هدفك اليومي بسهولة.',
  },
  {
    icon: 'Pill',
    title: 'مكملاتك بوقتها',
    description: 'الالتزام بالتوقيت يفرق — اربطها بعادة ثابتة بيومك.',
  },
  {
    icon: 'CheckCircle2',
    title: 'علّم إنجازك',
    description: 'كل يوم تكمله علامة. التقدّم البسيط المتراكم هو السر.',
  },
]
