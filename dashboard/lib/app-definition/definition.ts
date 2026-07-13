import type { AppDefinition } from "@/lib/app-definition/types";export const appDefinition: AppDefinition = {
  "runtimeKind": "custom_app",
  "app": {
    "id": "890de0bb5702",
    "name": "Competitor Radar",
    "description": "Competitor Radar custom App upgraded from an existing database App.",
    "version": "1.0.0",
    "baseUrl": "https://competitor-radar.kylon.app"
  },
  "entities": [
    {
      "id": "customers",
      "label": "Customer",
      "pluralLabel": "Customers",
      "description": "Customers records.",
      "titleField": "customer_name",
      "table": "customers",
      "idColumn": "id",
      "createdAtColumn": "created_at",
      "fields": [
        {
          "key": "customer_name",
          "column": "customer_name",
          "label": "Customer",
          "type": "text",
          "required": true
        },
        {
          "key": "competitor_name",
          "column": "competitor_name",
          "label": "Competitor",
          "type": "text",
          "required": true
        },
        {
          "key": "competitor_domain",
          "column": "competitor_domain",
          "label": "Competitor Domain",
          "type": "url",
          "required": true
        },
        {
          "key": "channel_id",
          "column": "channel_id",
          "label": "Channel",
          "type": "text"
        },
        {
          "key": "created_at",
          "column": "created_at",
          "label": "Created",
          "type": "date",
          "system": true
        }
      ],
      "relationships": []
    },
    {
      "id": "tracked_urls",
      "label": "Tracked URL",
      "pluralLabel": "Tracked URLs",
      "description": "Tracked URLs records.",
      "titleField": "url",
      "table": "tracked_urls",
      "idColumn": "id",
      "createdAtColumn": "created_at",
      "fields": [
        {
          "key": "customer_id",
          "column": "customer_id",
          "label": "Customer ID",
          "type": "number",
          "required": true
        },
        {
          "key": "competitor_name",
          "column": "competitor_name",
          "label": "Competitor",
          "type": "text",
          "required": true
        },
        {
          "key": "url",
          "column": "url",
          "label": "URL",
          "type": "url",
          "required": true
        },
        {
          "key": "page_type",
          "column": "page_type",
          "label": "Page Type",
          "type": "select",
          "required": true,
          "config": {
            "options": [
              {
                "id": "pricing",
                "color": "green",
                "label": "Pricing"
              },
              {
                "id": "careers",
                "color": "blue",
                "label": "Careers"
              },
              {
                "id": "blog",
                "color": "purple",
                "label": "Blog"
              },
              {
                "id": "changelog",
                "color": "orange",
                "label": "Changelog"
              },
              {
                "id": "other",
                "color": "gray",
                "label": "Other"
              }
            ]
          }
        },
        {
          "key": "created_at",
          "column": "created_at",
          "label": "Created",
          "type": "date",
          "system": true
        }
      ],
      "relationships": []
    },
    {
      "id": "raw_extracts",
      "label": "Raw Extract",
      "pluralLabel": "Raw Extracts",
      "description": "Raw Extracts records.",
      "titleField": "url",
      "table": "raw_extracts",
      "idColumn": "id",
      "createdAtColumn": "created_at",
      "fields": [
        {
          "key": "customer_id",
          "column": "customer_id",
          "label": "Customer ID",
          "type": "number",
          "required": true
        },
        {
          "key": "competitor_name",
          "column": "competitor_name",
          "label": "Competitor",
          "type": "text",
          "required": true
        },
        {
          "key": "page_type",
          "column": "page_type",
          "label": "Page Type",
          "type": "select",
          "config": {
            "options": [
              {
                "id": "pricing",
                "color": "green",
                "label": "Pricing"
              },
              {
                "id": "careers",
                "color": "blue",
                "label": "Careers"
              },
              {
                "id": "blog",
                "color": "purple",
                "label": "Blog"
              },
              {
                "id": "changelog",
                "color": "orange",
                "label": "Changelog"
              },
              {
                "id": "other",
                "color": "gray",
                "label": "Other"
              }
            ]
          }
        },
        {
          "key": "url",
          "column": "url",
          "label": "URL",
          "type": "url",
          "required": true
        },
        {
          "key": "extract_date",
          "column": "extract_date",
          "label": "Date",
          "type": "date",
          "required": true
        },
        {
          "key": "content",
          "column": "content",
          "label": "Content",
          "type": "text"
        },
        {
          "key": "created_at",
          "column": "created_at",
          "label": "Created",
          "type": "date",
          "system": true
        }
      ],
      "relationships": []
    },
    {
      "id": "analyst_notes",
      "label": "Analyst Note",
      "pluralLabel": "Analyst Notes",
      "description": "Analyst Notes records.",
      "titleField": "competitor_name",
      "table": "analyst_notes",
      "idColumn": "id",
      "createdAtColumn": "created_at",
      "fields": [
        {
          "key": "customer_id",
          "column": "customer_id",
          "label": "Customer ID",
          "type": "number",
          "required": true
        },
        {
          "key": "competitor_name",
          "column": "competitor_name",
          "label": "Competitor",
          "type": "text",
          "required": true
        },
        {
          "key": "analyst",
          "column": "analyst",
          "label": "Analyst",
          "type": "select",
          "required": true,
          "config": {
            "options": [
              {
                "id": "Pricing Analyst",
                "color": "green",
                "label": "Pricing Analyst"
              },
              {
                "id": "Hiring Analyst",
                "color": "blue",
                "label": "Hiring Analyst"
              },
              {
                "id": "Changelog Analyst",
                "color": "orange",
                "label": "Changelog Analyst"
              },
              {
                "id": "Content Analyst",
                "color": "purple",
                "label": "Content Analyst"
              }
            ]
          }
        },
        {
          "key": "note_date",
          "column": "note_date",
          "label": "Date",
          "type": "date",
          "required": true
        },
        {
          "key": "note",
          "column": "note",
          "label": "Note",
          "type": "text"
        },
        {
          "key": "created_at",
          "column": "created_at",
          "label": "Created",
          "type": "date",
          "system": true
        }
      ],
      "relationships": []
    },
    {
      "id": "strategy_briefs",
      "label": "Strategy Brief",
      "pluralLabel": "Strategy Briefs",
      "description": "Strategy Briefs records.",
      "titleField": "competitor_name",
      "table": "strategy_briefs",
      "idColumn": "id",
      "createdAtColumn": "created_at",
      "fields": [
        {
          "key": "customer_id",
          "column": "customer_id",
          "label": "Customer ID",
          "type": "number",
          "required": true
        },
        {
          "key": "competitor_name",
          "column": "competitor_name",
          "label": "Competitor",
          "type": "text",
          "required": true
        },
        {
          "key": "brief_date",
          "column": "brief_date",
          "label": "Date",
          "type": "date",
          "required": true
        },
        {
          "key": "severity",
          "column": "severity",
          "label": "Severity",
          "type": "number",
          "required": true
        },
        {
          "key": "brief",
          "column": "brief",
          "label": "Brief",
          "type": "text"
        },
        {
          "key": "created_at",
          "column": "created_at",
          "label": "Created",
          "type": "date",
          "system": true
        }
      ],
      "relationships": []
    }
  ]
};
