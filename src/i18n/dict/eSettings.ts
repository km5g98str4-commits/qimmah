import type { Lang } from '@/lib/appPreferences'

export interface ESettingsCopy {
  title: string
  subtitle: string
  backToProfile: string
  groups: {
    account: { title: string; description: string }
    preferences: { title: string; description: string }
    notifications: { title: string; description: string }
    privacyData: { title: string; description: string }
    about: { title: string; description: string }
  }
  sections: {
    plan: string
    language: string
    healthDevice: string
    privacy: string
    data: string
    app: string
    install: string
    internal: string
  }
}

export const eSettingsCopy: Record<Lang, ESettingsCopy> = {
  ar: {
    title: 'الإعدادات',
    subtitle: 'رتّب حسابك وتفضيلاتك وبياناتك من مكان واحد.',
    backToProfile: 'الرجوع لملفك',
    groups: {
      account: {
        title: 'الحساب',
        description: 'تسجيل الدخول والمزامنة وإدارة الحساب.',
      },
      preferences: {
        title: 'التفضيلات',
        description: 'خطتك، لغتك، وربط بيانات جهازك.',
      },
      notifications: {
        title: 'التذكيرات',
        description: 'اختَر وش تبي قِمّة يذكّرك فيه.',
      },
      privacyData: {
        title: 'الخصوصية والبيانات',
        description: 'تحكّم في بياناتك وموافقتك.',
      },
      about: {
        title: 'عن قِمّة',
        description: 'التثبيت والإصدار وطريقة حساب أرقامك.',
      },
    },
    sections: {
      plan: 'خطتك',
      language: 'اللغة',
      healthDevice: 'الصحة والجهاز',
      privacy: 'الخصوصية والثقة',
      data: 'بياناتك',
      app: 'التطبيق',
      install: 'تثبيت قِمّة',
      internal: 'أدوات الفريق',
    },
  },
  en: {
    title: 'Settings',
    subtitle: 'Manage your account, preferences, and data in one place.',
    backToProfile: 'Back to your profile',
    groups: {
      account: {
        title: 'Account',
        description: 'Sign-in, sync, and account management.',
      },
      preferences: {
        title: 'Preferences',
        description: 'Your plan, language, and connected device data.',
      },
      notifications: {
        title: 'Reminders',
        description: 'Choose what you want Qimmah to remind you about.',
      },
      privacyData: {
        title: 'Privacy & data',
        description: 'Control your data and consent.',
      },
      about: {
        title: 'About Qimmah',
        description: 'Installation, version, and how your numbers are calculated.',
      },
    },
    sections: {
      plan: 'Your plan',
      language: 'Language',
      healthDevice: 'Health & device',
      privacy: 'Privacy & trust',
      data: 'Your data',
      app: 'The app',
      install: 'Install Qimmah',
      internal: 'Team tools',
    },
  },
}
