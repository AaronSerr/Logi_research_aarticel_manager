/**
 * Migration script: JSON → SQLite
 * Migrates data from old/data/backups/articles.json to Prisma SQLite database
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OldArticle {
  id: string;
  title: string;
  author: string[];
  year: number;
  date: string;
  abstract: string;
  conclusion?: string;
  keywords: string[];
  subjects: string[];
  tags: string[];
  universities: string[];
  companies: string[];
  journal?: string;
  doi?: string;
  language?: string;
  num_pages?: number;
  rating: number;
  read: boolean;
  favorite: boolean;
  first_imp?: string;
  notes?: string;
  comment?: string;
  research_question?: string;
  methodology?: string;
  data_used?: string;
  results?: string;
  limitations?: string;
  date_added: string;
  file_name: string;
}

async function migrate() {
  console.log('🚀 Starting migration from JSON to SQLite...\n');

  // Path to old articles JSON
  const oldDataPath = path.join(__dirname, '../../old/data/backups/articles.json');

  if (!fs.existsSync(oldDataPath)) {
    console.error(`❌ File not found: ${oldDataPath}`);
    console.log('💡 Make sure the old/ directory is in the project root.');
    process.exit(1);
  }

  // Load old data
  console.log('📖 Loading articles from JSON...');
  const rawData = fs.readFileSync(oldDataPath, 'utf-8');
  const oldArticles: OldArticle[] = JSON.parse(rawData);
  console.log(`✅ Found ${oldArticles.length} articles\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const oldArticle of oldArticles) {
    try {
      console.log(`📝 Migrating: ${oldArticle.id} - ${oldArticle.title}`);

      // Create or find authors
      const authorRecords = await Promise.all(
        oldArticle.author.map(async (authorName) => {
          return prisma.author.upsert({
            where: { name: authorName },
            update: {},
            create: { name: authorName },
          });
        })
      );

      // Create or find keywords
      const keywordRecords = await Promise.all(
        (oldArticle.keywords || []).map(async (keywordName) => {
          return prisma.keyword.upsert({
            where: { name: keywordName },
            update: {},
            create: { name: keywordName },
          });
        })
      );

      // Create or find subjects
      const subjectRecords = await Promise.all(
        (oldArticle.subjects || []).map(async (subjectName) => {
          return prisma.subject.upsert({
            where: { name: subjectName },
            update: {},
            create: { name: subjectName },
          });
        })
      );

      // Create or find tags
      const tagRecords = await Promise.all(
        (oldArticle.tags || []).map(async (tagName) => {
          return prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });
        })
      );

      // Create or find universities
      const universityRecords = await Promise.all(
        (oldArticle.universities || []).map(async (universityName) => {
          return prisma.university.upsert({
            where: { name: universityName },
            update: {},
            create: { name: universityName },
          });
        })
      );

      // Create or find companies
      const companyRecords = await Promise.all(
        (oldArticle.companies || []).map(async (companyName) => {
          return prisma.company.upsert({
            where: { name: companyName },
            update: {},
            create: { name: companyName },
          });
        })
      );

      // Create article with relations
      await prisma.article.create({
        data: {
          id: oldArticle.id,
          title: oldArticle.title,
          abstract: oldArticle.abstract,
          conclusion: oldArticle.conclusion || '',
          year: oldArticle.year,
          date: oldArticle.date,
          dateAdded: oldArticle.date_added,
          journal: oldArticle.journal || '',
          doi: oldArticle.doi || '',
          language: oldArticle.language || 'English',
          numPages: oldArticle.num_pages || 0,
          researchQuestion: oldArticle.research_question || '',
          methodology: oldArticle.methodology || '',
          dataUsed: oldArticle.data_used || '',
          results: oldArticle.results || '',
          limitations: oldArticle.limitations || '',
          firstImp: oldArticle.first_imp || '',
          notes: oldArticle.notes || '',
          comment: oldArticle.comment || '',
          rating: oldArticle.rating,
          read: oldArticle.read,
          favorite: oldArticle.favorite,
          fileName: oldArticle.file_name,

          // Relations
          authors: {
            create: authorRecords.map((author) => ({
              authorId: author.id,
            })),
          },
          keywords: {
            create: keywordRecords.map((keyword) => ({
              keywordId: keyword.id,
            })),
          },
          subjects: {
            create: subjectRecords.map((subject) => ({
              subjectId: subject.id,
            })),
          },
          tags: {
            create: tagRecords.map((tag) => ({
              tagId: tag.id,
            })),
          },
          universities: {
            create: universityRecords.map((university) => ({
              universityId: university.id,
            })),
          },
          companies: {
            create: companyRecords.map((company) => ({
              companyId: company.id,
            })),
          },
        },
      });

      successCount++;
      console.log(`   ✅ Success\n`);
    } catch (error) {
      errorCount++;
      console.error(`   ❌ Error: ${error}\n`);
    }
  }

  // Copy PDFs and notes
  console.log('\n📄 Copying PDF files...');
  const oldPdfDir = path.join(__dirname, '../../old/data/pdfs');
  const newPdfDir = path.join(__dirname, '../storage/pdfs');

  if (fs.existsSync(oldPdfDir)) {
    fs.cpSync(oldPdfDir, newPdfDir, { recursive: true });
    console.log('✅ PDFs copied\n');
  } else {
    console.log('⚠️  No PDF directory found\n');
  }

  console.log('📝 Copying note files...');
  const oldNotesDir = path.join(__dirname, '../../old/data/notes');
  const newNotesDir = path.join(__dirname, '../storage/notes');

  if (fs.existsSync(oldNotesDir)) {
    fs.cpSync(oldNotesDir, newNotesDir, { recursive: true });
    console.log('✅ Notes copied\n');
  } else {
    console.log('⚠️  No notes directory found\n');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful migrations: ${successCount}`);
  console.log(`❌ Failed migrations: ${errorCount}`);
  console.log(`📚 Total articles: ${oldArticles.length}`);

  const stats = await Promise.all([
    prisma.article.count(),
    prisma.author.count(),
    prisma.keyword.count(),
    prisma.subject.count(),
    prisma.tag.count(),
    prisma.university.count(),
    prisma.company.count(),
  ]);

  console.log('\n📈 Database statistics:');
  console.log(`   Articles: ${stats[0]}`);
  console.log(`   Authors: ${stats[1]}`);
  console.log(`   Keywords: ${stats[2]}`);
  console.log(`   Subjects: ${stats[3]}`);
  console.log(`   Tags: ${stats[4]}`);
  console.log(`   Universities: ${stats[5]}`);
  console.log(`   Companies: ${stats[6]}`);

  console.log('\n✨ Migration complete!\n');
}

migrate()
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
