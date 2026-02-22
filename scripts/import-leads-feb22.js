const { Client } = require('pg')

const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing'); process.exit(1) }

const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } })

function parseSGT(s) {
  const [datePart, timePart, ampm] = s.trim().split(' ')
  let [h, m, sec] = timePart.split(':').map(Number)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  const [yr, mo, dy] = datePart.split('-').map(Number)
  return new Date(Date.UTC(yr, mo - 1, dy, h - 8, m, sec))
}

const yesNo = s => s.trim().toLowerCase() === 'yes'

const leads = [
  { first: 'KY', last: 'Lor', email: 'lorky66@yahoo.com.sg', phone: '96976304', postal: '520921', pet: 'Momo', breed: 'French Bulldog', age: '2', gender: 'Female', vf: 'Yes', reactive: 'No', clinic: 'Kai Vet', vet: 'Dr Yeo', pain: 'No', condition: "Hind leg weakness. Can't stand or walk.", how: 'Google Search', conv: '2026-02-22 01:17:20 PM' },
  { first: 'Boo Seng', last: 'Khoo', email: 'lisonbskhoo@yahoo.com.sg', phone: '+65 9617 5267', postal: '530132', pet: 'Koby', breed: 'Pomsky', age: '30/04/2020 coming to 6 yo', gender: 'Female Neutered', vf: 'Yes', reactive: 'No', clinic: 'VES', vet: 'Dr Naomi Shimizu', pain: 'No', condition: 'Vet recommends to do rehab as 2 weeks after FHO should be able to walk without limping. Surgery done 05/02 discharged 06/02. Vet reviewed 20/02', how: 'Vet or clinic referred', conv: '2026-02-20 04:22:18 PM' },
  { first: 'Zeenath', last: 'Begam', email: 'zeenath.begam19@gmail.com', phone: '93392019', postal: '330044', pet: 'COCO', breed: 'Shizhu', age: '11', gender: 'Female', vf: 'Yes', reactive: 'No', clinic: 'Advanced vetcare', vet: 'Dr. Hon Zachary', pain: 'Yes', condition: 'Both back legs weakness unable to move, urine and pass motion. Does not have strength use from legs to move around or lift up back legs to pee', how: 'Google Search', conv: '2026-02-20 03:13:51 PM' },
  { first: 'Jeffeury', last: 'Tan', email: 'tanjowena@gmail.com', phone: '96861698', postal: '559972', pet: 'Juno', breed: 'Golden retriever', age: '7', gender: 'Male Neutered', vf: 'Yes', reactive: 'Yes', clinic: 'Brighton Pet Vet - Serangoon', vet: 'NA', pain: 'Yes', condition: 'Back right leg show difficulty of walking, climbing up to car seat', how: 'Friend or Family', conv: '2026-02-20 12:40:15 PM' },
  { first: 'Charlotte', last: 'Tan', email: 'charlottetanjingying@gmail.com', phone: '90936222', postal: '322106', pet: 'Bacon', breed: 'Chihuahua', age: '14', gender: 'Male Neutered', vf: 'Yes', reactive: 'Yes', clinic: 'Gaia Vets', vet: 'Dr Grace', pain: 'Yes', condition: 'Still able to walk, but back legs seems stiff and unable to bend properly', how: 'Other', conv: '2026-02-20 11:41:12 AM' },
  { first: 'Jarren', last: 'Tay', email: 'jarrentwh@gmail.com', phone: '96517207', postal: '823613', pet: 'Ponyo', breed: 'Dachshund', age: '4', gender: 'Female Neutered', vf: 'Yes', reactive: 'Yes', clinic: 'Beecroft animal specialist & Emergency Hospital', vet: 'Dr Foo', pain: 'Yes', condition: 'Unsure whether she is in pain as she has high pain tolerance. She recent undergone Hemilaminectomy surgery for her grade 5 ivdd/slip disc, currently a week post-op and she is still unable to use and feel her hind legs. She requires assistance to express urination and defecation.', how: 'Google Search', conv: '2026-02-19 05:22:10 PM' },
  { first: 'Cheralyn', last: 'Lim', email: 'cheralim@hotmail.com', phone: '90466456', postal: '238309', pet: 'Hazel', breed: 'Chihuahua', age: 'Under 2', gender: 'Female Neutered', vf: 'Yes', reactive: 'No', clinic: 'Pets avenue', vet: 'Dr gordon', pain: 'Yes', condition: 'In certain positions, she is in pain. She has difficulty walking straight and is still a little wobbly after the seizure', how: 'Google Search', conv: '2026-02-14 07:35:15 PM' },
  { first: 'Janice', last: 'Chan', email: 'qiaohui_janice@hotmail.com', phone: '97807320', postal: '541294', pet: 'Buller', breed: 'Pomeranian', age: '14', gender: 'Male', vf: 'Yes', reactive: 'Yes', clinic: 'Apex Vet', vet: 'Any', pain: 'Yes', condition: 'Weakening hind legs, cannot stand for long, walks with a limp, hind right leg looks stiff.', how: 'Google Search', conv: '2026-02-13 11:04:48 PM' },
  { first: 'Rachel', last: 'Raeburn', email: 'rraeburn75@gmail.com', phone: '+65 9742 5770', postal: '419154', pet: 'Leo', breed: 'Maltese', age: '16', gender: 'Male Neutered', vf: 'Yes', reactive: 'Yes', clinic: 'Animal Infirmary', vet: 'Misc', pain: 'Yes', condition: "Left elbow joint inflammation (x'ray done, given Libre jab on 11 Feb) - no improvement and now he is not putting pressure on the right limb as well so we've requested for oral meds for pain relief (collecting today - 13 Feb). Would like to find out options to help his condition such as acupuncture, massage, etc.", how: 'Google Search', conv: '2026-02-13 12:56:36 PM' },
  { first: 'Cherie', last: 'Ng', email: 'cherieng@live.com.sg', phone: '96810076', postal: '322113', pet: 'Tako', breed: 'Pomeranian', age: '9', gender: 'Male Neutered', vf: 'Yes', reactive: 'No', clinic: 'Advanced Vetcare', vet: 'Dr Shu Ning', pain: 'Yes', condition: 'Seems to have issue walking for long, and also signs of arthritis', how: 'Google Search', conv: '2026-02-08 04:23:07 PM' },
  { first: 'MINAL', last: 'BHIWANDKAR', email: 'minal.bhiwandkar@gmail.com', phone: '90187808', postal: '128041', pet: 'JERRY', breed: 'SHIBA INU', age: '11 MONTHS', gender: 'Male', vf: 'Yes', reactive: 'No', clinic: 'West Coast Vetcare', vet: 'West Coast Vetcare', pain: 'No', condition: 'The right side hind leg limps while walking.', how: 'IG/FB/TikTok', conv: '2026-02-06 02:39:06 PM' },
  { first: 'Emilly', last: 'Ong', email: 'emilly.ong@gmail.com', phone: '+65 9366 6581', postal: '460534', pet: 'Nikko', breed: 'Miniature Schnauzer', age: '6 years 5months', gender: 'Female Neutered', vf: 'Yes', reactive: 'No', clinic: 'Woodgrove Veterinary', vet: 'Doctor Enoka', pain: 'No', condition: 'No issue. Just looking for more exercise eg swimming.', how: 'IG/FB/TikTok', conv: '2026-02-06 11:12:03 AM' },
  { first: 'Lim', last: 'Xiu mei', email: 'piggymei87@gmail.com', phone: '89496291', postal: '750592', pet: 'Xiao Bai', breed: 'Maltipoo', age: '7 month', gender: 'Male', vf: 'Yes', reactive: 'Yes', clinic: 'Vetmedic animal clinic & surgery', vet: 'Forget', pain: 'No', condition: '', how: 'Google Search', conv: '2026-02-06 02:05:37 AM' },
]

async function main() {
  await client.connect()
  let inserted = 0, skipped = 0

  for (const r of leads) {
    const name = `${r.first} ${r.last}`.trim()
    const phone = r.phone.replace(/\s+/g, '').replace(/^\+65/, '')
    const ts = parseSGT(r.conv)

    // Dedup check
    const dup = await client.query('SELECT id FROM leads WHERE owner_email=$1 AND pet_name=$2 LIMIT 1', [r.email, r.pet])
    if (dup.rows.length) { console.log(`  SKIP (dup): ${name} / ${r.pet}`); skipped++; continue }

    await client.query(`
      INSERT INTO leads (
        id, owner_name, owner_email, owner_phone, post_code, how_heard,
        pet_name, species, breed, age, pet_gender,
        vet_friendly, reactive_to_pets, has_pain,
        condition, clinic_name, attending_vet,
        status, first_visit, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1,$2,$3,$4,$5,
        $6,'Unknown',$7,$8,$9,
        $10,$11,$12,
        $13,$14,$15,
        'new',true,$16,$16
      )`,
      [name, r.email, phone, r.postal, r.how,
       r.pet, r.breed, r.age, r.gender,
       yesNo(r.vf), yesNo(r.reactive), yesNo(r.pain),
       r.condition || null, r.clinic, r.vet,
       ts]
    )
    console.log(`  ✓ ${name} / ${r.pet}  (${ts.toISOString()})`)
    inserted++
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`)
  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
