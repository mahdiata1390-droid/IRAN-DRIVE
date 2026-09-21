import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { currentLang } from '@/i18n';
import { C, R } from '@/lib/theme';

/**
 * Public privacy policy (reachable without sign-in).
 * Iranian app stores (e.g. Myket) require a privacy policy URL — this page is
 * hosted with the app and ships inside the native build too.
 */
export default function PrivacyScreen() {
  const fa = currentLang() === 'fa';

  const H = ({ children }: { children: string }) => (
    <Text style={{ color: C.red, fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 6 }}>
      {children}
    </Text>
  );
  const P = ({ children }: { children: string }) => (
    <Text style={{ color: C.textDim, fontSize: 13.5, lineHeight: 22, marginBottom: 6 }}>{children}</Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: fa ? 'حریم خصوصی' : 'Privacy Policy',
          headerStyle: { backgroundColor: C.bgElevated },
          headerTintColor: C.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', letterSpacing: 1 }}>
            UCHIHA CLAN
          </Text>
          <Text style={{ color: C.textFaint, fontSize: 11, letterSpacing: 2, marginTop: 2 }}>
            {fa ? 'پیام‌رسان خصوصی کلن' : 'PRIVATE CLAN MESSENGER'}
          </Text>
        </View>
        <Text style={{ color: C.textFaint, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
          {fa ? 'آخرین به‌روزرسانی: سپتامبر ۲۰۲۶' : 'Last updated: September 2026'}
        </Text>

        {fa ? (
          <>
            <H>۱. اطلاعاتی که جمع‌آوری می‌کنیم</H>
            <P>
              برای عملکرد این پیام‌رسان، این موارد در سرورهای Supabase ذخیره می‌شود: نام کاربری، نام
              نمایشی، بیوگرافی اختیاری، UID کالاف دیوتی (اختیاری)، عکس پروفایل (اختیاری)، پیام‌ها،
              درخواست‌های دوستی، گزارش‌های مدیریت و زمان آخرین حضور شما.
            </P>
            <H>۲. رمز عبور</H>
            <P>
              رمزهای عبور هرگز توسط برنامه ذخیره یا نمایش داده نمی‌شوند؛ احراز هویت کاملاً توسط
              سرویس Supabase Auth و به‌صورت رمزنگاری‌شده انجام می‌شود.
            </P>
            <H>۳. پیام‌ها و محتوا</H>
            <P>
              پیام‌های خصوصی فقط برای فرستنده و گیرنده قابل مشاهده است. دسترسی به همه‌ی داده‌ها با
              قوانین سطح ردیف (RLS) پایگاه‌داده کنترل می‌شود و مسئولان کلن فقط به ابزارهای مدیریتی
              (مسکوت/مسدودسازی/بررسی گزارش‌ها) دسترسی دارند.
            </P>
            <H>۴. رسانه و فایل‌ها</H>
            <P>
              عکس‌ها، ویدیوها، فایل‌ها و پیام‌های صوتی در یک باکس ذخیره‌سازی خصوصی نگهداری و فقط با
              لینک امضاشده‌ی موقت (۱ ساعته) در اختیار اعضای مجاز قرار می‌گیرد.
            </P>
            <H>۵. نوتیفیکیشن‌ها</H>
            <P>
              اگر اجازه بدهید، برای پیام‌های جدید و اطلاعیه‌های کلن اعلان روی دستگاه شما نمایش داده
              می‌شود. این اجازه در تنظیمات سیستم‌عامل قابل لغو است.
            </P>
            <H>۶. اشتراک‌گذاری با شخص ثالث</H>
            <P>
              داده‌های شما به هیچ شخص ثالثی فروخته یا اشتراک‌گذاری نمی‌شود. زیرساخت مورد استفاده:
              Supabase (احراز هویت، پایگاه‌داده، ذخیره‌سازی) و Vercel (نسخه‌ی وب).
            </P>
            <H>۷. حذف حساب و داده‌ها</H>
            <P>
              برای حذف کامل حساب و همه‌ی داده‌هایتان، از داخل برنامه به Owner کلن درخواست دهید یا به
              ایمیل پشتیبانی پیام بدهید؛ حذف در حداکثر ۷۲ ساعت انجام می‌شود.
            </P>
            <H>۸. مخاطب</H>
            <P>هر سوالی درباره‌ی حریم خصوصی دارید از داخل برنامه به Owner کلن پیام دهید.</P>
          </>
        ) : (
          <>
            <H>1. Data we collect</H>
            <P>
              To operate this messenger we store on Supabase servers: your username, display name,
              optional bio, optional COD Mobile UID, optional profile photo, your messages, friend
              requests, moderation reports, and your last-seen timestamp.
            </P>
            <H>2. Passwords</H>
            <P>
              Passwords are never stored or visible to the app; authentication is handled entirely
              by Supabase Auth with server-side hashing.
            </P>
            <H>3. Messages and content</H>
            <P>
              Private messages are visible only to their sender and recipient. All data access is
              enforced by database Row Level Security; clan moderators only hold moderation tools
              (mute / ban / report review), not free access to private chats.
            </P>
            <H>4. Media and files</H>
            <P>
              Photos, videos, documents and voice messages are kept in a private storage bucket and
              shared only through short-lived (1 hour) signed URLs to authorized members.
            </P>
            <H>5. Notifications</H>
            <P>
              With your permission, the device shows notifications for new messages and clan
              announcements. You can revoke this any time in system settings.
            </P>
            <H>6. Third parties</H>
            <P>
              Your data is never sold or shared with third parties. Infrastructure used: Supabase
              (auth, database, storage) and Vercel (web version).
            </P>
            <H>7. Account and data deletion</H>
            <P>
              To delete your account and all associated data, contact the clan Owner inside the app
              or message support; deletion completes within 72 hours.
            </P>
            <H>8. Contact</H>
            <P>For any privacy question, message the clan Owner inside the app.</P>
          </>
        )}
      </ScrollView>
    </View>
  );
}
