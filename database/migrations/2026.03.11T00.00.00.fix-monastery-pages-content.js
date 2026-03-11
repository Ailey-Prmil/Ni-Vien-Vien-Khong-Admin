'use strict';

/**
 * Fix monastery_pages.content column for PostgreSQL jsonb migration.
 *
 * Strapi tries to ALTER the column type to jsonb but fails if existing rows
 * contain plain text that is not valid JSON. This migration nullifies any
 * rows whose content cannot be parsed as JSON so the ALTER can proceed.
 */

async function up(knex) {
  const hasTable = await knex.schema.hasTable('monastery_pages');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('monastery_pages', 'content');
  if (!hasColumn) return;

  // On PostgreSQL: null out rows where content is not valid JSON
  const client = knex.client.config.client;
  if (client === 'postgres' || client === 'pg') {
    await knex.raw(`
      UPDATE monastery_pages
      SET content = NULL
      WHERE content IS NOT NULL
        AND (
          content::text = ''
          OR NOT (content::text ~ '^\\s*[\\[\\{]')
        )
    `);
  }
}

async function down() {
  // Not reversible — data was already invalid
}

module.exports = { up, down };
