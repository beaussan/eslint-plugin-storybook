/**
 * @fileoverview Story files should have a default export
 * @author Yann Braga
 */

import path from 'path'
import { Program, Node } from '@typescript-eslint/types/dist/ast-spec'

import { CategoryId } from '../utils/constants'
import { isImportDeclaration, isLiteral, isIdentifier } from '../utils/ast'
import { createStorybookRule } from '../utils/create-storybook-rule'
import { ReportFixFunction } from '@typescript-eslint/experimental-utils/dist/ts-eslint'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

export = createStorybookRule({
  name: 'default-exports',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'Story files should have a default export',
      categories: [CategoryId.CSF, CategoryId.RECOMMENDED],
      recommended: 'error',
    },
    messages: {
      shouldHaveDefaultExport: 'The file should have a default export.',
      fixSuggestion: 'Add default export',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
  },

  create(context) {
    // variables should be defined here

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    // any helper functions should go here or else delete this section
    const getComponentName = (node: Program, filePath: string) => {
      const name = path.basename(filePath).split('.')[0]
      const imported = node.body.find((stmt: Node) => {
        if (
          isImportDeclaration(stmt) &&
          isLiteral(stmt.source) &&
          stmt.source.value.startsWith(`./${name}`)
        ) {
          return !!stmt.specifiers.find(
            (spec) => isIdentifier(spec.local) && spec.local.name === name
          )
        }
      })
      return imported ? name : null
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    let hasDefaultExport = false
    let hasStoriesOfImport = false

    return {
      ImportSpecifier(node) {
        if (node.imported.name === 'storiesOf') {
          hasStoriesOfImport = true
        }
      },
      ExportDefaultSpecifier: function () {
        hasDefaultExport = true
      },
      ExportDefaultDeclaration: function () {
        hasDefaultExport = true
      },
      'Program:exit': function (program: Program) {
        if (!hasDefaultExport && !hasStoriesOfImport) {
          const componentName = getComponentName(program, context.getFilename())
          const firstNonImportStatement = program.body.find((n) => !isImportDeclaration(n))
          const node = firstNonImportStatement || program.body[0] || program

          const report = {
            node,
            messageId: 'shouldHaveDefaultExport',
          } as const

          const fix: ReportFixFunction = (fixer) => {
            const metaDeclaration = componentName
              ? `export default { component: ${componentName} }\n`
              : 'export default {}\n'
            return fixer.insertTextBefore(node, metaDeclaration)
          }

          context.report({
            ...report,
            fix,
            suggest: [
              {
                messageId: 'fixSuggestion',
                fix,
              },
            ],
          })
        }
      },
    }
  },
})
