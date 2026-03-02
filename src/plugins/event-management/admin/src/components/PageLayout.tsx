import React from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  navigationAction?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Simple page shell that avoids depending on internal Strapi
 * `Layouts` components that are not reliably exported in all v5 builds.
 */
export function PageLayout({
  title,
  subtitle,
  navigationAction,
  children,
}: PageLayoutProps) {
  return (
    <Box>
      {/* Header */}
      <Box
        background="neutral0"
        paddingTop={6}
        paddingBottom={4}
        paddingLeft={10}
        paddingRight={10}
        borderColor="neutral150"
        style={{ borderBottom: '1px solid' }}
      >
        {navigationAction && (
          <Box marginBottom={2}>{navigationAction}</Box>
        )}
        <Typography variant="alpha" as="h1">
          {title}
        </Typography>
        {subtitle && (
          <Box marginTop={1}>
            <Typography variant="epsilon" textColor="neutral600">
              {subtitle}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box padding={8}>{children}</Box>
    </Box>
  );
}
