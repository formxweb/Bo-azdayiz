# Boğazdayız fotoğrafları

Buraya yalnızca Boğazdayız / Tosun Paşa'nın kendi fotoğraflarını koyun. Dosya adı, fotoğrafın yerini belirler.

**Yemekler** (`menu-<id>.jpg`): fotoğraf menüdeki tabağın içine ve yemek detay penceresinin büyük görsel alanına yerleşir.

| dosya | yemek |
|---|---|
| `menu-haydari.jpg` | Peynirli haydari |
| `menu-kisir.jpg` | Nar ekşili cevizli kısır |
| `menu-fava.jpg` | Bakla fava |
| `menu-borulce.jpg` | Börülce salatası |
| `menu-tarator.jpg` | Dereotlu havuç tarator |
| `menu-enginar.jpg` | Enginar yatağında taze fasulye |
| `menu-peynir.jpg` | Ezine beyaz peynir |
| `menu-domates.jpg` | Domates söğüş |
| `menu-salatalik.jpg` | Salatalık söğüş |
| `menu-patates.jpg` | Hardal soslu patates salatası |
| `menu-deniz.jpg` | Deniz mahsulleri salatası |
| `menu-kalamar.jpg` | Kalamar |
| `menu-borek.jpg` | Üç peynirli sebzeli Çin böreği |
| `menu-izgara.jpg` | Karışık Izgara Tabağı |
| `menu-balik.jpg` | Izgara Balık |
| `menu-baklava.jpg` | Baklava |
| `menu-meyve.jpg` | Mevsim meyveleri |
| `menu-mesrubat.jpg` | Sınırsız meşrubat |

**Sahneler**: `gemi.jpg` (Tosun Paşa, iskelede), `semazen.jpg` (sahne), `bogaz.jpg` (23:30, dönüş).

İsteğe bağlı `alt.json`: `{ "menu-kalamar": "Kalamar, dip sosla" }`

Sonra `npm run media` komutunu çalıştırın. AVIF/WebP setleri `public/media/` içine yazılır; site bunları kendiliğinden yerleştirir.
Sahne yerleşimini fotoğrafsız görmek için siteyi `?media=preview` ile açın.
