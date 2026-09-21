# راهنمای انتشار UCHIHA Clan Messenger در مایکت

## ۱. دریافت فایل APK

آخرین APK امضاشده از صفحه‌ی Releases مخزن گیت‌هاب دانلود کنید:

> **https://github.com/mahdiata1390-droid/IRAN-DRIVE/releases/tag/v1.0.0**

- فایل `uchiha-clan.apk` (حدود ۴۰ تا ۸۰ مگابایت، Release امضاشده)
- اگر Release هنوز منتشر نشده، تب **Actions** → ورک‌فلو «Android APK Build» → آخرین ران سبز → آرتیفکت `uchiha-clan-apk`

## ۲. اطلاعات فنی که مایکت موقع آپلود می‌پرسد

| مورد | مقدار |
| --- | --- |
| نام بسته (Package) | `com.uchihaclan.messenger` |
| نام برنامه | UCHIHA Clan |
| نسخه (versionName) | 1.0.0 |
| نسخه‌ی داخلی (versionCode) | 1 |
| حداقل اندروید | 7.0 (API 24) |
| اندروید هدف | Android 15 (API 35) |
| امضا | APK امضاشده با کلید Release (PKCS12) |
| دسترسی‌ها | دوربین، گالری (عکس/ویدیو)، میکروفون، اینترنت، نوتیفیکیشن |
| معماری‌ها | arm64-v8a, armeabi-v7a, x86, x86_64 |

## ۳. متن معرفی (کپی‌پیست در پنل مایکت)

### نام
UCHIHA Clan Messenger

### خلاصه (تا ۸۰ کاراکتر)
پیام‌رسان اختصاصی و امن کلن UCHIHA در کالاف دیوتی موبایل

### توضیحات کامل

UCHIHA Clan Messenger — پیام‌رسان خصوصی کلن UCHIHA در کالاف دیوتی موبایل

با UCHIHA Clan Messenger عضوهای کلن همیشه در دسترس‌اند:

- **چت خصوصی** — پیام مستقیم با هر عضو، با تیک خوانده‌شدن، تایپینگ و وضعیت آنلاین
- **چت کلن** — چت رسمی کلن با منشن، ری‌اکشن، سنجاق و جست‌وجوی پیام
- **اتاق‌ها (Rooms)** — General، War Room، Ranked، Multiplayer برای هماهنگی
- **اعلامیه‌ها** — اطلاعیه‌های رسمی لیدرها با اولویت عادی/مهم/بحرانی
- **کلن‌وار** — برنامه‌ریزی جنگ کلن، حریف، نتیجه و تاریخچه
- **دوستانه‌ها** — لیست دوستان، درخواست دوستی، شروع چت سریع
- **جست‌وجوی سراسری** — کاربر، اتاق و پیام
- **صدا و رسانه** — پیام صوتی، عکس، ویدیو و فایل تا ۵۰ مگابایت
- **امنیت** — رمز عبور امن، رول‌های Owner/Leader/Co-Leader/Mod/Member که سمت سرور اعمال می‌شوند

تم تاریک سرخ‌سیاه با هویت بصری اُچیها، فارسی کامل با پشتیبانی راست‌به‌چپ + انگلیسی.

### دسته‌بندی (Category)
بازی — ابزار (Game Tools) — یا ارتباطات (Communication)

### برچسب‌ها
کالاف دیوتی موبایل، کلن، چت، پیام‌رسان، گیمر، UCHIHA، CODM

## ۴. چک‌لیست آپلود در پنل مایکت

1. ورود به [panel.myket.ir](https://panel.myket.ir) با حساب توسعه‌دهنده
2. «افزودن برنامه جدید» → نوع: **اپلیکیشن اندروید**
3. آپلود فایل **APK** (همین `uchiha-clan.apk`)
4. مایکت خودش نام بسته، versionCode و امضای APK را می‌خواند و با فرم زیر مطابقت می‌دهد
5. تکمیل: نام، خلاصه، توضیحات، دسته‌بندی، برچسب‌ها (بالا ↑)
6. تصاویر اسکرین‌شات (حداقل ۲ عدد) + آیکون ۵۱۲×۵۱۲ — از PWA بگیرید: `https://uchiha-clan-messenger.vercel.app` → تصاویر `icons/icon-512.png` و `icons/icon-maskable-512.png`
7. لینک حریم خصوصی (Privacy Policy URL) — **الزامی**: `https://uchiha-clan-messenger.vercel.app/privacy` (صفحه‌ی فارسی/انگلیسی داخل خود اپ هم هست)
8. ایمیل پشتیبانی و وب‌سایت: وب‌سایت همان نسخه‌ی وب (PWA) است: `https://uchiha-clan-messenger.vercel.app`
9. سنتیم (سرویس پرداخت مایکت) — این برنامه **رایگان** است و پرداخت درون‌برنامه‌ای ندارد؛ مرحله سنتیم را رد کنید
10. ارسال برای بررسی — مایکت معمولاً ۱ تا ۳ روز کاری بررسی می‌کند

## ۵. نکته‌ی امضا برای آپدیت‌های بعدی

از این به بعد هر بیلد CI از `scripts/patch-android-signing.js` یک keystore جدید در رانر CI می‌سازد.
برای اینکه کاربران بتوانند بدون حذف برنامه آپدیت کنند (و برای آپدیت در مایکت) باید **همیشه با یک keystore ثابت** امضا شود:

1. یک‌بار روی سیستمی که keytool دارد (یا WSL/لینوکس):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore uchiha-release.keystore \
     -alias uchiha -keyalg RSA -keysize 2048 -validity 10000 \
     -storepass <رمز> -keypass <رمز> \
     -dname "CN=UCHIHA Clan Messenger, OU=UCHIHA, O=UCHIHA Clan, L=Tehran, C=IR"
   ```
2. محتوای فایل را به‌صورت base64 در سکرت `ANDROID_KEYSTORE_BASE64` ذخیره کنید:
   ```bash
   base64 -w0 uchiha-release.keystore   # خروجی را در سکرت بگذارید
   ```
3. در پنل گیت‌هاب: Settings → Secrets and variables → Actions → **New repository secret**
   - `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `KEY_ALIAS`
4. این بلوک را **قبل از** مرحله «Configure release signing» به `.github/workflows/android-build.yml` اضافه کنید:
   ```yaml
   - name: Restore keystore
     run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/uchiha-release.keystore
   ```

اسکریپت `scripts/patch-android-signing.js` اگر فایل keystore موجود باشد، دیگری نمی‌سازد — یعنی همه‌ی بیلدهای بعدی با همان کلید ثابت امضا می‌شوند.