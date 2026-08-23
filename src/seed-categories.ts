import mongoose from "mongoose";
import dns from "dns";
import dotenv from "dotenv";
import path from "path";
import Category from "./models/Category";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dns.setServers(["8.8.8.8", "8.8.4.4"]);

interface SeedCategory {
  name: { uz: string; ru: string; en: string; zhHans: string; zhHant: string };
  icon: string;
  type: "ad" | "product";
  order: number;
}

const AD_CATEGORIES: SeedCategory[] = [
  {
    name: {
      uz: "Santexnika",
      ru: "Сантехника",
      en: "Plumbing",
      zhHans: "水暖工程",
      zhHant: "水暖工程",
    },
    icon: "🔧",
    type: "ad",
    order: 1,
  },
  {
    name: {
      uz: "Elektrik xizmati",
      ru: "Электрика",
      en: "Electrical work",
      zhHans: "电工服务",
      zhHant: "電工服務",
    },
    icon: "⚡",
    type: "ad",
    order: 2,
  },
  {
    name: {
      uz: "Ustaxona (duradgorlik)",
      ru: "Столярные работы",
      en: "Carpentry",
      zhHans: "木工服务",
      zhHant: "木工服務",
    },
    icon: "🪚",
    type: "ad",
    order: 3,
  },
  {
    name: {
      uz: "Tozalash xizmati",
      ru: "Уборка",
      en: "Cleaning",
      zhHans: "清洁服务",
      zhHant: "清潔服務",
    },
    icon: "🧹",
    type: "ad",
    order: 4,
  },
  {
    name: {
      uz: "Ta'mirlash qilish",
      ru: "Ремонт",
      en: "Repair",
      zhHans: "维修服务",
      zhHant: "維修服務",
    },
    icon: "🛠️",
    type: "ad",
    order: 5,
  },
  {
    name: {
      uz: "Konditsioner o'rnatish",
      ru: "Установка кондиционеров",
      en: "AC installation",
      zhHans: "空调安装",
      zhHant: "空調安裝",
    },
    icon: "❄️",
    type: "ad",
    order: 6,
  },
  {
    name: {
      uz: "Ko'chirtirish xizmati",
      ru: "Переезд",
      en: "Moving",
      zhHans: "搬家服务",
      zhHant: "搬家服務",
    },
    icon: "🚚",
    type: "ad",
    order: 7,
  },
  {
    name: {
      uz: "Go'zallik saloni",
      ru: "Красота и уход",
      en: "Beauty & care",
      zhHans: "美容护理",
      zhHant: "美容護理",
    },
    icon: "💅",
    type: "ad",
    order: 8,
  },
  {
    name: {
      uz: "Bog'dorchilik",
      ru: "Садоводство",
      en: "Gardening",
      zhHans: "园艺服务",
      zhHant: "園藝服務",
    },
    icon: "🌱",
    type: "ad",
    order: 9,
  },
  {
    name: {
      uz: "Boshqa xizmatlar",
      ru: "Другие услуги",
      en: "Other services",
      zhHans: "其他服务",
      zhHant: "其他服務",
    },
    icon: "📦",
    type: "ad",
    order: 10,
  },
];

const PRODUCT_CATEGORIES: SeedCategory[] = [
  {
    name: {
      uz: "Maishiy texnika",
      ru: "Бытовая техника",
      en: "Home appliances",
      zhHans: "家电",
      zhHant: "家電",
    },
    icon: "🏠",
    type: "product",
    order: 1,
  },
  {
    name: {
      uz: "Elektronika",
      ru: "Электроника",
      en: "Electronics",
      zhHans: "电子产品",
      zhHant: "電子產品",
    },
    icon: "📱",
    type: "product",
    order: 2,
  },
  {
    name: {
      uz: "Qurilish materiallari",
      ru: "Стройматериалы",
      en: "Building materials",
      zhHans: "建材",
      zhHant: "建材",
    },
    icon: "🧱",
    type: "product",
    order: 3,
  },
  {
    name: {
      uz: "Mebel",
      ru: "Мебель",
      en: "Furniture",
      zhHans: "家具",
      zhHant: "家具",
    },
    icon: "🪑",
    type: "product",
    order: 4,
  },
];

async function upsertCategories(items: SeedCategory[]) {
  let created = 0;
  let existing = 0;

  for (const item of items) {
    const result = await Category.findOneAndUpdate(
      { "name.uz": item.name.uz, type: item.type },
      { $setOnInsert: { ...item, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if ((result as any).createdAt.getTime() === (result as any).updatedAt.getTime()) {
      created++;
    } else {
      existing++;
    }
  }

  return { created, existing };
}

async function seedCategories() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("Connected to MongoDB");

    const ads = await upsertCategories(AD_CATEGORIES);
    console.log(`Ad categories: ${ads.created} created, ${ads.existing} already exist`);

    const products = await upsertCategories(PRODUCT_CATEGORIES);
    console.log(
      `Product categories: ${products.created} created, ${products.existing} already exist`
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error("Seed error:", error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

seedCategories();
