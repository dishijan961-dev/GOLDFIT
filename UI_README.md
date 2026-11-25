GOLD FIT UI to'plami
====================
public/intro.mp4, public/intro-poster.jpg  -> logo videosi (800 KB)
app/_ui/premium.css   -> barcha uslublar (qora + elektr sariq)
app/_ui/Btn.tsx       -> <Btn> va <BtnLink>: gold | silver | white | glass | dark | danger, pill | rect, sm | md | lg
app/_ui/Toggle.tsx    -> shisha yoqish/o'chirish (formada name bilan yuboriladi)
app/_ui/Section.tsx   -> bo'lim kartasi, superOnly = oltin hoshiyali
app/_ui/Splash.tsx    -> mini app ochilganda video (sessiyada 1 marta)
app/_ui/icons.tsx     -> SVG ikonkalar (<Icon name="crown" />)
app/ui-demo/page.tsx  -> hammasini ko'rish sahifasi: /ui-demo

Mini appga video qo'shish: asosiy sahifa faylining boshiga
  import Splash from "./_ui/Splash";
va qaytarilayotgan JSX ichiga <Splash /> yozing.
