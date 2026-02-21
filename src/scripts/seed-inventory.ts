import "dotenv/config"
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

function category(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('session') || n.includes('rental') || n.includes('deposit')) return 'SERVICE'
  if (n.includes('balto')) return 'Orthopaedic Braces'
  if (n.includes('ruffwear') || n.includes('orthodog') || n.includes('harness') || n.includes('lil back')) return 'Mobility Aids'
  if (n.includes('jt ') || n.includes('conc ') || n.includes('conc.') || n.includes('teapill') || n.includes('wan') || n.includes('tang')) return 'Traditional Chinese Medicine'
  if (n.includes('pet cubes') || n.includes('gently cooked') || n.includes('chicken rice')) return 'Nutrition & Food'
  if (n.includes('nexgard') || n.includes('librela') || n.includes('neurobion') || n.includes('daneuron') || n.includes('melatonin') || n.includes('phenobarb')) return 'Pharmaceuticals'
  if (n.includes('f10') || n.includes('shampoo') || n.includes('epi-') || n.includes('oratene') || n.includes('manuka') || n.includes('dermcare')) return 'Hygiene & Grooming'
  if (n.includes('dfang') || n.includes('pet play') || n.includes('cool mat') || n.includes('healfast') || n.includes('light therapy') || n.includes('assisi')) return 'Rehabilitation Equipment'
  if (n.includes('omega') || n.includes('collagen') || n.includes('probiotic') || n.includes('vitamin') || n.includes('supplement') || n.includes('antinol') || n.includes('cobalaplex') || n.includes('nutracalm') || n.includes('ocu-glo') || n.includes('le ') || n.includes('aktivait') || n.includes('algae') || n.includes('nordic') || n.includes('myos') || n.includes('connectin') || n.includes('bifilactin') || n.includes('bioresiliant') || n.includes('pea 300') || n.includes('astamate') || n.includes('nutraflex') || n.includes('nutrazyl') || n.includes('nutraease') || n.includes('nutripet') || n.includes('nutri-plus') || n.includes('pro-') || n.includes('evexia') || n.includes('pain away') || n.includes('aminavast')) return 'Supplements'
  if (n.includes('sock') || n.includes('brace') || n.includes('hobble') || n.includes('hip harness') || n.includes('front support') || n.includes('lifting aid') || n.includes('rubber pad')) return 'Mobility Aids'
  if (n.includes('eye') || n.includes('lanomax') || n.includes('jpn') || n.includes('ocu')) return 'Eye Care'
  if (n.includes('tcm') || n.includes('di gu') || n.includes('rehmannia') || n.includes('long dan') || n.includes('bu yang')) return 'Traditional Chinese Medicine'
  return 'General'
}

function brand(name: string): string | null {
  if (name.startsWith('JT ') || name.startsWith('Jt ')) return 'JT'
  if (name.startsWith('Balto')) return 'Balto'
  if (name.startsWith('Ruffwear')) return 'Ruffwear'
  if (name.startsWith('Orthodog')) return 'Orthodog'
  if (name.startsWith('LE ') || name.startsWith('Le ')) return 'LE'
  if (name.startsWith('F10')) return 'F10'
  if (name.startsWith('Dfang')) return 'Dfang'
  if (name.startsWith('PET PLAY') || name.startsWith('Pet Play')) return 'PET PLAY'
  if (name.startsWith('Nexgard')) return 'Nexgard'
  if (name.startsWith('Antinol')) return 'Antinol'
  if (name.startsWith('Connectin')) return 'Connectin'
  if (name.startsWith('Pet Cubes')) return 'Pet Cubes'
  if (name.startsWith('Ocu-Glo')) return 'Ocu-Glo'
  if (name.startsWith('Nordic')) return 'Nordic Naturals'
  if (name.startsWith('Lil Back')) return 'Lil Back Bracer'
  if (name.startsWith('Calmer')) return 'Calmer Canine'
  if (name.startsWith('JPN')) return 'JPN'
  if (name.startsWith('Aloveen')) return 'Aloveen'
  if (name.startsWith('Conc')) return 'Jing Tang'
  return null
}

// [name, sku, sell, cost, onhand]
const PRODUCTS: [string, string, number, number, number][] = [
  ['Aero Chamber For Inhaler', '1780', 110.00, 69.55, 1],
  ['Aktivait Small Breed (60 Caps)', '1143', 61.21, 40.60, 3],
  ['Algae Vegan Omega-3 (120gel)', '1597', 60.48, 35.30, 1],
  ['Aloveen Conditioner 500ml', '1264', 37.00, 18.25, 1],
  ['Aloveen Oatmeal Conditioner (200ml)', '1262', 22.50, 22.50, 1],
  ['Aloveen Oatmeal Conditioner (500ml)', '1563', 39.59, 19.80, 1],
  ['Aminavast 1000mg (1 bot)', '1821', 79.00, 59.40, 2],
  ['Aminavast 300mg For Cats (60cap)', '1834', 46.66, 34.56, 1],
  ['Anti Slip/Waterproof Socks (Large)', '1766', 20.00, 8.00, 1],
  ['Anti Slip/Waterproof Socks (Medium)', '1765', 18.00, 8.00, 1],
  ['Anti Slip/Waterproof Socks (Small)', '1764', 16.00, 7.30, 1],
  ['Anti Slip/Waterproof Sock (#0)', '1627', 14.00, 6.00, 1],
  ['Anti Slip/Waterproof Sock (#1)', '1017', 15.00, 10.00, 1],
  ['Anti Slip/Waterproof Sock (#2)', '1020', 16.00, 10.67, 0],
  ['Anti Slip/Waterproof Sock (#3)', '1463', 17.00, 11.00, 0],
  ['Anti Slip/Waterproof Sock (#4)', '1464', 18.00, 11.00, 0],
  ['Anti Slip/Waterproof Sock (#5)', '1462', 19.00, 6.00, 1],
  ['Anti Slip/Waterproof Sock (#6)', '1465', 20.00, 0, 1],
  ['Antinol Rapid 90 Caps (1 box)', '1803', 89.00, 48.90, 4],
  ['Antinol Rapid For Dogs 60s (1 BOX)', '1871', 59.00, 35.50, 1],
  ['Assisi Loop (2.0) Large 20cm (1 PIECE)', '1835', 498.00, 370.10, 1],
  ['Astamate', '1023', 36.40, 24.30, 88],
  ['Balto | Body Life (L)', '1415', 288.00, 140.00, 1],
  ['Balto | Carpal Brace (M)', '1079', 150.00, 67.29, 1],
  ['Balto | Carpal Brace (S)', '1080', 119.60, 59.80, 4],
  ['Balto | Carpal Splint Brace (L)', '1084', 195.00, 90.24, 1],
  ['Balto | Cat Neck Brace', '1076', 160.00, 73.26, 9],
  ['Balto | Double Elbow Brace (M)', '1077', 139.00, 74.75, 1],
  ['Balto | Hock Brace (M)', '1059', 150.00, 67.29, 1],
  ['Balto | Hock Brace (S)', '1060', 140.00, 59.80, 2],
  ['Balto | Hock Brace (XS)', '1061', 140.00, 59.80, 1],
  ['Balto | Hock Brace (XXS)', '1078', 140.00, 59.80, 3],
  ['Balto | Left Knee Brace (M)', '1062', 245.00, 109.00, 1],
  ['Balto | Left Knee Brace (S)', '1064', 200.00, 96.16, 3],
  ['Balto | Left Knee Brace (XS)', '1067', 200.00, 96.16, 1],
  ['Balto | Left Knee Brace (XXS)', '1069', 200.00, 104.65, 1],
  ['Balto | Life Brace for Hip (L)', '1082', 332.50, 202.68, 4],
  ['Balto | Life Brace for Hip (M)', '1081', 332.50, 202.68, 3],
  ['Balto | Life Brace for Hip (S)', '1083', 285.00, 168.90, 3],
  ['Balto | Life Brace For Hip (XS)', '1281', 249.11, 143.32, 1],
  ['Balto | Neck Brace (L)', '1072', 160.00, 73.26, 1],
  ['Balto | Neck Brace (M)', '1073', 150.00, 68.76, 1],
  ['Balto | Neck Brace (S)', '1074', 150.00, 68.76, 1],
  ['Balto | Neck Brace (XS)', '1075', 150.00, 68.76, 4],
  ['Balto | Pull Brace (M)', '1280', 210.00, 105.00, 2],
  ['Balto | Pull Brace (S)', '1279', 202.50, 81.66, 1],
  ['Balto | Pull Brace (XS)', '1414', 195.00, 54.46, 2],
  ['Balto | Right Knee Brace (M)', '1063', 220.00, 109.90, 1],
  ['Balto | Right Knee Brace (S)', '1065', 200.00, 96.16, 2],
  ['Balto | Right Knee Brace (XL)', '1066', 280.00, 120.00, 1],
  ['Balto | Right Knee Brace (XS)', '1068', 200.00, 96.16, 3],
  ['Balto | Right Knee Brace (XXS)', '1070', 200.00, 104.65, 1],
  ['Balto | Shoulder Brace (M)', '1071', 342.88, 171.44, 2],
  ['Balto Carpal Brace (XS)', '1629', 120.60, 112.60, 2],
  ['Balto Carpal Brace (XXS)', '1630', 120.60, 80.40, 1],
  ['Balto Carpal Brace W/ Splint S (S)', '1633', 175.00, 95.37, 1],
  ['Balto Carpal Brace W/ Splint Xs (XS)', '1632', 150.00, 72.50, 2],
  ['Balto Carpal Brace W/ Splint Xxs (XXS)', '1631', 150.00, 72.75, 2],
  ['Balto Double Elbow Brace (L)', '1794', 139.00, 65.00, 1],
  ['Balto Double Knee Brace (XS)', '1798', 350.00, 166.50, 3],
  ['Balto Double Knee Brace (XXS)', '1795', 350.00, 155.00, 2],
  ['Balto Shoulder Brace (S)', '1608', 281.50, 140.70, 2],
  ['Balto Shoulder Brace (XS)', '1588', 281.50, 103.00, 3],
  ['Bifilactin Dx (Vet) - 2 Probiotic', '1757', 122.53, 70.00, 12],
  ['BioResiliant (100g)', '1432', 42.00, 21.00, 1],
  ['Bu Yang Huan Wu 200 Teapills', '1663', 35.50, 12.59, 2],
  ['Calmer Canine L', '1867', 330.00, 230.00, 2],
  ['Calmer Canine M', '1840', 330.00, 230.00, 2],
  ['Calmer Canine S', '1838', 330.00, 230.00, 1],
  ['Cobalaplex 0.5mg (60cap)', '1549', 60.00, 35.30, 1],
  ['Conc Di Tan Tan 0.5g 100cap', '1759', 88.00, 36.90, 2],
  ['Conc Di Tan Tang 0.2g 50cap', '1760', 60.00, 24.00, 1],
  ['Conc Liver Happy 0.2g 50cap', '1763', 67.50, 23.00, 2],
  ['Conc Liver Happy 0.5g 100cap', '1762', 88.00, 36.70, 2],
  ['Conc Rehmannia 6 0.2g (50cap)', '1817', 67.00, 27.40, 3],
  ['Conc Wei Qi Booster Biscuit (85g)', '1525', 80.00, 28.20, 1],
  ['Conc. Four Paws Damp Heat 0.2g (50 cap)', '1672', 54.20, 27.10, 2],
  ['Conc. Four Paws Damp Heat 0.5g (100 Cap)', '1669', 84.42, 42.21, 2],
  ['Conc. Ku Shen Si Wu 50 Cap - 0.2g', '1671', 54.20, 27.10, 1],
  ['Conc. Si Wu Xiao Feng 100 - 0.5g', '1668', 84.42, 42.21, 1],
  ['Connectin Powder (12oz)', '1013', 65.40, 32.70, 1],
  ['Connectin Powder (23oz)', '1431', 124.26, 55.00, 1],
  ['Connectin Soft Chew Large Dog 80c', '1542', 110.00, 55.00, 1],
  ['Connectin Soft Chews (20 Chews)', '1049', 28.00, 14.00, 1],
  ['Connectin Soft Chews (300)', '1430', 286.00, 115.00, 1],
  ['Daneuron (1tab)', '1779', 0.41, 0.10, 100],
  ['Decadurobolin 25mg/ml', '1888', 84.53, 56.35, 1],
  ['Dermcare Serbolyse Shampoo (250ml)', '1492', 12.80, 12.80, 2],
  ['Di Gu Pi San 200 Teapills', '1661', 35.50, 12.59, 1],
  ['Dog Lifting Aid-Mobility Harness (L)', '1519', 140.00, 76.85, 1],
  ['Domoso Roll-On (100gm)', '1558', 64.20, 32.10, 1],
  ['Empty Vegetarian Capsule (00)', '1596', 0.09, 0.05, 500],
  ['Epi-Otic Skin & Ear Cleanser (120ml)', '1475', 24.00, 11.77, 1],
  ['Epi-Soothe Shampoo (500ml)', '1517', 40.00, 20.00, 1],
  ['Evexia HF40 Tab (40 Tab)', '1850', 59.00, 38.15, 1],
  ['Extra Anti-Slip Socks (Large)', '1769', 36.00, 13.30, 1],
  ['Extra Anti-Slip Socks (Medium)', '1768', 34.00, 12.00, 1],
  ['Extra Anti-Slip Socks (Small)', '1767', 32.00, 11.20, 1],
  ['Extra Anti-Slip Socks XL', '1770', 28.00, 13.30, 1],
  ['F10 Medicated Shampoo (500ml)', '1263', 78.00, 4.50, 1],
  ['F10 Solution (10ml)', '1839', 10.00, 4.50, 1],
  ['F10 Solution (50ml)', '1816', 8.00, 3.14, 2],
  ['F10 Solution (100ml)', '1845', 12.00, 4.50, 1],
  ['F10 Solution (150ml)', '1740', 14.00, 4.50, 1],
  ['F10 Solution (300ml)', '1578', 18.00, 10.80, 2],
  ['F10 Solution (500ml)', '1050', 22.00, 9.20, 2],
  ['F10 Solution (700ml)', '1535', 8.00, 8.10, 2],
  ['Front Support Harness L', '1056', 48.00, 10.80, 1],
  ['Front Support Harness M', '1055', 48.00, 9.20, 2],
  ['Front Support Harness S', '1054', 38.00, 8.10, 2],
  ['Full Body Lifting Aid (M)', '1520', 120.00, 76.85, 1],
  ['Generic Ultrasonic Gel', '1027', 8.00, 3.14, 4],
  ['Healfast PEMF Loop', '1501', 235.00, 199.75, 1],
  ['Hip Harness L', '1053', 107.00, 53.50, 2],
  ['Hip Harness M', '1051', 58.00, 10.80, 2],
  ['Hip Harness S', '1052', 48.00, 9.20, 2],
  ['Hot Cold Gel Pack', '1574', 15.00, 6.00, 1],
  ['IV Infusion Set W/ Butterfly Needle (25G)', '1858', 15.00, 3.00, 1],
  ['JPN ColloRx Collagen Eye Drops (10ml)', '1607', 39.00, 23.40, 1],
  ['JPN ColloRx Lanosterol Eye Drops (10ML)', '1582', 188.00, 150.00, 1],
  ['JT Conc. Body Sore 0.2g (50 cap)', '1249', 60.00, 35.51, 2],
  ['JT Conc. Body Sore 0.5g (100 cap)', '1248', 88.00, 35.51, 1],
  ['JT Conc. Bone Stasis Formula 0.5g', '1247', 88.00, 35.51, 1],
  ['JT Conc. Bu Yang Huan Wu 0.5g', '1245', 88.00, 40.57, 5],
  ['JT Conc Eight Gentlemen 0.5g (100 cap)', '1252', 88.00, 49.57, 1],
  ['JT Conc Rehmannia 6 (100cap)', '1540', 88.00, 45.00, 4],
  ['JT Conc. Damp Heat Skin 0.2g', '1444', 88.00, 23.42, 5],
  ['JT Conc. Damp Heat Skin 0.5g', '1113', 88.00, 40.34, 2],
  ['JT Conc. Di Gu Pi San 0.2g', '1243', 60.00, 35.51, 6],
  ['JT Conc. Di Gu Pi San 0.5g', '1242', 88.00, 35.51, 4],
  ['JT Conc. Epimedium Formula 0.5g', '1241', 88.00, 40.34, 4],
  ['JT Conc. Gui Pi Tang 0.5g', '1240', 88.00, 38.01, 2],
  ['JT Conc. Shen Calmer 0.2g', '1124', 60.00, 69.15, 1],
  ['JT Conc. Shen Calmer 0.5g', '1123', 88.00, 42.79, 3],
  ['JT Conc. Tendon/Ligament 0.2g', '1443', 60.00, 23.42, 5],
  ['JT Conc. Tendon/Ligament 0.5g', '1147', 88.00, 40.34, 3],
  ['JT Conc Stasis Breaker 0.5g', '1250', 88.00, 35.51, 6],
  ['JT Conc Si Miao San 0.5g', '1576', 88.00, 42.10, 4],
  ['JT Da Bu Yin Wan 0.5g', '1219', 88.00, 38.64, 1],
  ['JT Eight Gentlemen (200 TP)', '1209', 38.00, 35.64, 8],
  ['JT Four Immortals 0.5g', '1205', 88.00, 36.78, 3],
  ['JT Happy Earth 0.5g', '1628', 100.89, 105.00, 1],
  ['JT Heart Qi Tonic 0.5g', '1115', 88.00, 27.58, 1],
  ['JT Jie Gu San 0.5g (200 cap)', '1198', 88.00, 36.78, 2],
  ['JT Liver Happy 0.5g (200 cap)', '1146', 88.00, 36.78, 4],
  ['JT Loranthus Form. 0.5g', '1196', 88.00, 41.02, 1],
  ['JT REH 11 Conc. 0.5g (100 cap)', '1189', 88.00, 41.55, 2],
  ['JT REH 14 (200 cap)', '1584', 35.50, 14.23, 2],
  ['JT Relief Salve 4oz', '1186', 48.00, 20.67, 1],
  ['JT Si Wu Tang (200 TP)', '1179', 38.00, 18.52, 1],
  ['JT Si Wu Tang 0.5g (200 cap)', '1180', 88.00, 36.78, 1],
  ['JT Six Gentlemen 0.5g', '1178', 104.72, 42.41, 1],
  ['JT Wei Qi Booster 0.5g', '1172', 88.00, 36.78, 4],
  ['JT Xiao Yao San 0.5g', '1161', 88.00, 36.78, 3],
  ['JT Zhi Bai Di Huang 0.5g', '1151', 88.00, 38.64, 3],
  ['Lanomax Eyedrops 10ml', '1833', 135.00, 99.00, 1],
  ['LE Bio-Collagen UC II (60 caps)', '1458', 52.00, 36.70, 1],
  ['Le Arthromax Advanced Nt2 (60Caps)', '1532', 50.00, 36.68, 2],
  ['Le Milk Thistle 60softgels', '1538', 44.28, 29.52, 1],
  ['Le Vitamin E 400iu 90softgels', '1539', 44.28, 29.52, 1],
  ['Librela 30mg/ml (1 VIAL)', '1836', 183.60, 91.80, 1],
  ['Lil Back Bracer (Large)', '1435', 250.00, 166.00, 12],
  ['Lil Back Bracer (M)', '1433', 230.00, 139.00, 8],
  ['Lil Back Bracer (Small)', '1434', 215.00, 180.00, 10],
  ['Long Dan Xie Gan 200 Teapill', '1664', 35.50, 10.95, 1],
  ['Manuka Honey G Gel (15g)', '1266', 18.95, 7.92, 1],
  ['Melatonin (1mg)', '1493', 9.26, 4.63, 1],
  ['Myos Canine Muscle Formula 440g', '1841', 155.00, 110.00, 17],
  ['NaCl 0.9% 100ml', '1857', 13.50, 4.50, 1],
  ['Neocort Skin Emollient Cream (50gm)', '1474', 16.14, 7.28, 1],
  ['Neurobion (30tab)', '1754', 15.80, 9.30, 1],
  ['Nexgard Spectra (2-3.5kg)', '1783', 59.94, 28.56, 1],
  ['Nexgard Spectra (15-30kg)', '1562', 100.05, 28.29, 1],
  ['Nexgard Spectra (3.5-7.5kg)', '1560', 88.35, 28.29, 1],
  ['Nexgard Spectra (7.5-15kg)', '1561', 58.50, 28.29, 1],
  ['Nordic Natural Omega3 237ml', '1647', 68.00, 20.36, 1],
  ['Nordic Naturals Omega 3 Pet 473ml', '1436', 82.00, 48.64, 1],
  ['Nutracalm (60cap)', '1823', 146.40, 95.00, 1],
  ['Nutraease (100caps)', '1775', 80.25, 53.50, 1],
  ['Nutraflex (60caps)', '1774', 83.46, 55.64, 1],
  ['Nutrazyl (15cap)', '1773', 36.00, 24.00, 1],
  ['Nutripet Paste (200g)', '1005', 25.00, 14.38, 1],
  ['Nutri-Plus Gel 120.5g', '1624', 26.40, 16.50, 1],
  ['Ocu-Glo Powder Blend (30 caps)', '1494', 58.00, 36.16, 1],
  ['Ocu-Glo Vision M & L Dogs (90 cap)', '1419', 115.50, 81.32, 1],
  ['Ocu-Glo Vision S Dogs (90 cap)', '1420', 103.80, 78.97, 1],
  ['Oratene Toothpaste Gel (70g)', '1604', 39.00, 27.10, 1],
  ['Oratene Water Additive Bottle (115ml)', '1605', 55.90, 37.30, 1],
  ['Orthodog Hip Brace (L)', '1423', 216.00, 108.00, 1],
  ['Orthodog Hip Brace (M)', '1422', 216.00, 108.00, 1],
  ['Orthodog Hip Brace (S)', '1421', 216.00, 108.00, 1],
  ['Pain Away Chew 10s', '1852', 21.26, 13.65, 1],
  ['PEA 300mg (60 Caps)', '1854', 65.00, 35.00, 1],
  ['Pet Cubes (Cancer)', '1497', 9.00, 6.00, 1],
  ['Pet Cubes (Kidney)', '1498', 10.80, 5.00, 1],
  ['Pet Cubes Beef (Gently Cooked)', '1677', 6.80, 3.90, 1],
  ['Pet Cubes Beef (Senior)', '1283', 7.00, 28.00, 1],
  ['Pet Cubes Digestive (ibs)', '1842', 11.70, 7.80, 1],
  ['Pet Cubes Duck (Under 8)', '1496', 7.50, 3.70, 1],
  ['Pet Cubes Kangaroo (Senior)', '1452', 8.60, 28.00, 1],
  ['Pet Cubes Lamb (Gently Cooked)', '1676', 9.00, 3.97, 1],
  ['Pet Cubes Lamb (Raw)', '1515', 5.70, 3.70, 1],
  ['Pet Cubes Nasi Lamak', '1735', 7.80, 4.70, 1],
  ['Pet Cubes Pork (Senior)', '1453', 9.72, 4.00, 1],
  ['Pet Cubes Pork (Under 8)', '1495', 7.58, 3.70, 1],
  ['Pet Cubes Salmon And Whitefish', '1875', 8.43, 3.97, 1],
  ['PET PLAY Cool Mat', '1730', 92.00, 78.20, 1],
  ['PET PLAY House Basic', '1731', 135.00, 114.75, 1],
  ['PET PLAY House Premium', '1732', 167.00, 141.95, 1],
  ['PET PLAY Non-Fold Pads (5mm)', '1728', 126.00, 107.10, 1],
  ['Pro-Fibre 500g', '1439', 55.00, 30.00, 1],
  ['Pro-Kolin Advanced Dog Syringe (30ml)', '1822', 50.00, 27.00, 2],
  ['Red Light Therapy Squares (1 box)', '1887', 350.00, 180.00, 1],
  ['Rehmannia 6 200 Teapills', '1662', 35.50, 12.59, 1],
  ['Rubber Pad 4.5cm (2 sets)', '1030', 24.35, 5.20, 46],
]

async function main() {
  console.log('Seeding inventory...')
  let created = 0
  let skipped = 0

  for (const [name, sku, sell, cost, onhand] of PRODUCTS) {
    const cat = category(name)
    if (cat === 'SERVICE') { skipped++; continue }

    const existing = await prisma.inventory_items.findFirst({ where: { sku } })
    if (existing) { console.log(`  skip (exists): ${name}`); skipped++; continue }

    const markup = cost > 0 ? Math.round(((sell - cost) / cost) * 100 * 100) / 100 : null

    await prisma.inventory_items.create({
      data: {
        sku,
        name,
        category: cat,
        brand: brand(name),
        cost_price: cost > 0 ? cost : null,
        sell_price: sell > 0 ? sell : null,
        markup_pct: markup,
        stock_on_hand: Math.max(0, onhand),
        stock_min: 1,
        stock_max: 10,
        unit: 'each',
      }
    })
    created++
    console.log(`  ✓ ${name} (${cat}) — stock: ${onhand}`)
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
