-- ============================================================
-- automation-store — seed products (run AFTER schema.sql + policies.sql)
-- Images use picsum.photos placeholders (seeded so they stay stable).
-- ============================================================

INSERT INTO products (name, price, brand, category, subcategory, image_url, description) VALUES
-- ---------- Women ----------
('Blue Top',                    500,  'Polo',            'Women', 'Tops',  'https://picsum.photos/seed/aestore1/400/500',  'Comfortable cotton blue top for everyday wear.'),
('Sleeveless Dress',            1000, 'H&M',             'Women', 'Dress', 'https://picsum.photos/seed/aestore2/400/500',  'Elegant sleeveless summer dress.'),
('Stylish Dress',              1500, 'Madame',          'Women', 'Dress', 'https://picsum.photos/seed/aestore3/400/500',  'Trendy stylish dress for special occasions.'),
('Winter Top',                  600,  'Madame',          'Women', 'Tops',  'https://picsum.photos/seed/aestore4/400/500',  'Warm knitted winter top.'),
('Summer White Top',            400,  'Polo',            'Women', 'Tops',  'https://picsum.photos/seed/aestore5/400/500',  'Light and breezy white summer top.'),
('Madame Red Saree',            2500, 'Madame',          'Women', 'Saree', 'https://picsum.photos/seed/aestore6/400/500',  'Traditional red saree with golden border.'),
('Biba Floral Saree',           2200, 'Biba',            'Women', 'Saree', 'https://picsum.photos/seed/aestore7/400/500',  'Handwoven floral saree by Biba.'),
('Elegant Evening Dress',       1800, 'H&M',             'Women', 'Dress', 'https://picsum.photos/seed/aestore8/400/500',  'Floor-length evening dress.'),

-- ---------- Men ----------
('Men Tshirt',                  400,  'Polo',            'Men',   'Tshirts', 'https://picsum.photos/seed/aestore9/400/500',  'Classic crew-neck cotton t-shirt.'),
('Premium Polo T-Shirts',       600,  'Polo',            'Men',   'Tshirts', 'https://picsum.photos/seed/aestore10/400/500', 'Premium pique polo t-shirt.'),
('Graphic Print Tshirt',        500,  'H&M',             'Men',   'Tshirts', 'https://picsum.photos/seed/aestore11/400/500', 'Casual graphic printed t-shirt.'),
('Slim Fit Jeans',              1200, 'Mast & Harbour',  'Men',   'Jeans',   'https://picsum.photos/seed/aestore12/400/500', 'Dark-wash slim fit denim jeans.'),
('Regular Fit Jeans',           1100, 'Mast & Harbour',  'Men',   'Jeans',   'https://picsum.photos/seed/aestore13/400/500', 'Comfortable regular fit jeans.'),
('Ripped Denim Jeans',          1400, 'H&M',             'Men',   'Jeans',   'https://picsum.photos/seed/aestore14/400/500', 'Trendy ripped denim jeans.'),
('Cotton Casual Shirt',         900,  'Allen Solly Junior','Men', 'Tshirts', 'https://picsum.photos/seed/aestore15/400/500', 'Soft cotton casual shirt.'),

-- ---------- Kids ----------
('Kids Frozen Dress',           700,  'Babyhug',         'Kids',  'Dress',   'https://picsum.photos/seed/aestore16/400/500', 'Cute frozen-themed party dress.'),
('Baby Girl Floral Dress',      650,  'Babyhug',         'Kids',  'Dress',   'https://picsum.photos/seed/aestore17/400/500', 'Soft floral dress for baby girls.'),
('Kids Cartoon Tshirt',         300,  'Kids Tales',      'Kids',  'Tops & Shirts', 'https://picsum.photos/seed/aestore18/400/500', 'Fun cartoon print t-shirt for kids.'),
('Boys Checked Shirt',          550,  'Allen Solly Junior','Kids','Tops & Shirts', 'https://picsum.photos/seed/aestore19/400/500', 'Smart checked shirt for boys.'),
('Kids Denim Jacket',           1000, 'Kids Tales',      'Kids',  'Tops & Shirts', 'https://picsum.photos/seed/aestore20/400/500', 'Warm denim jacket for kids.'),
('Toddler Striped Tee',         280,  'Babyhug',         'Kids',  'Tops & Shirts', 'https://picsum.photos/seed/aestore21/400/500', 'Colorful striped toddler t-shirt.'),
('Girls Party Frock',           850,  'Biba',            'Kids',  'Dress',   'https://picsum.photos/seed/aestore22/400/500', 'Sparkly party frock for girls.'),
('Sports Kids Tshirt',          350,  'Kids Tales',      'Kids',  'Tops & Shirts', 'https://picsum.photos/seed/aestore23/400/500', 'Breathable sports t-shirt for active kids.'),
('Denim Dungaree',              1200, 'Babyhug',         'Kids',  'Dress',   'https://picsum.photos/seed/aestore24/400/500', 'Adjustable denim dungaree for toddlers.');
