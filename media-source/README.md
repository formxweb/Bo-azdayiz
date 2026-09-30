# Boğazdayız fotoğrafları

Buraya yalnızca Boğazdayız / Tosun Paşa'nın kendi fotoğraflarını koyun. Dosya adı, fotoğrafın sahnedeki yerini belirler:

| dosya | sahne |
|---|---|
| `gemi.jpg` | Tosun Paşa, iskelede (Gecenin kapısı) |
| `meze.jpg` | Meze sofrası |
| `kalamar.jpg` | Ara sıcak |
| `izgara.jpg`, `balik.jpg` | Ana yemek |
| `baklava.jpg` | Tatlı |
| `muzik.jpg`, `oryantal.jpg`, `semazen.jpg`, `dj.jpg` | Sahne |
| `bogaz.jpg` | 23:30, dönüş |

İsteğe bağlı `alt.json`: `{ "meze": "Tosun Paşa'da meze sofrası, üstten" }`

Sonra `npm run media` komutunu çalıştırın. AVIF/WebP setleri `public/media/` içine yazılır; site bunları kendiliğinden yerleştirir.
Yerleşimi fotoğraf olmadan görmek için siteyi `?media=preview` ile açın.
