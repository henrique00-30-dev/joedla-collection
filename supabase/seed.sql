-- Produtos de demonstração opcionais.
-- Execute depois de schema.sql se quiser começar com um catálogo de exemplo.

insert into public.products (
  id,
  name,
  description,
  category,
  price,
  image_urls,
  sizes,
  colors,
  availability,
  stock,
  featured
)
values
(
  '11000000-0000-4000-8000-000000000001',
  'Conjunto Fitness Essencial',
  'Conjunto confortável para treino, com tecido firme e toque macio.',
  'fitness',
  139.90,
  array['https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=900&q=85'],
  array['P', 'M', 'G'],
  array['Marrom', 'Preto', 'Rosa'],
  'ready',
  6,
  true
),
(
  '11000000-0000-4000-8000-000000000002',
  'Conjunto Casual Feminino',
  'Conjunto leve e elegante para passeios e ocasiões do dia a dia.',
  'casual',
  159.90,
  array['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85'],
  array['P', 'M', 'G'],
  array['Bege', 'Terracota'],
  'ready',
  4,
  true
),
(
  '11000000-0000-4000-8000-000000000003',
  'Bolsa Festa Shine',
  'Bolsa pequena para festa com alça removível e acabamento sofisticado.',
  'bolsas',
  129.90,
  array['https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=85'],
  array[]::text[],
  array['Dourada', 'Prata', 'Preta'],
  'custom',
  0,
  true
),
(
  '11000000-0000-4000-8000-000000000004',
  'Mochila Infantil Doce',
  'Mochila infantil leve, espaçosa e confortável.',
  'infantil',
  119.90,
  array['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85'],
  array[]::text[],
  array['Rosa', 'Azul'],
  'ready',
  5,
  true
)
on conflict (id) do nothing;
