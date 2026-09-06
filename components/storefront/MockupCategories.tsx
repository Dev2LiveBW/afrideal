import Image from 'next/image';
import Link from 'next/link';

const CATEGORIES = [
  { name: 'Beauty & Hair', href: '/browse', img: 'https://images.unsplash.com/photo-1603878562683-c2149bda665f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80' },
  { name: 'Electronics', href: '/browse', img: 'https://images.unsplash.com/photo-1638803782506-d975a6809f43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80' },
  { name: 'Fashion', href: '/browse', img: 'https://images.unsplash.com/photo-1559050993-d4e4fbf11769?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80' },
  { name: 'Home & Kitchen', href: '/browse', img: 'https://images.unsplash.com/photo-1583241475880-083f84372725?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80' },
  { name: 'Auto Accessories', href: '/browse', img: 'https://images.unsplash.com/photo-1691382418385-bbe3cf722388?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80' },
  { name: 'Baby & Kids', href: '/browse', img: 'https://images.unsplash.com/photo-1725328493423-3771b60d02c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400&q=80' },
];

export function MockupCategories() {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-6">
      {CATEGORIES.map((cat, i) => (
        <Link key={i} href={cat.href} className="group flex flex-col items-center text-center gap-2">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gray-100 ring-1 ring-black/5 group-hover:ring-[#E67E22]/50 transition-all">
            <Image src={cat.img} alt={cat.name} fill className="object-cover object-center transition-transform duration-300 group-hover:scale-105" />
          </div>
          <span className="text-[13px] font-semibold text-gray-800 group-hover:text-[#E67E22] transition-colors">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
