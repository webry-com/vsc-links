import type { Config } from 'vscl'

export default {
  links: [
    {
      // axios.get('/some/path/whatever/' + data.item.id).then(response => {
      // axios.post('/get/the/user', {
      //     data: anything,
      // })
      // axios.get(`/path/${ subpath.value.id }/path`)
      include: ['**/*.ts', '**/*.js', '**/*.vue'],
      pattern: /axios\s*\.\s*(?<link>(get|post|put|patch|delete)\s*\((?:[^(),]|\([^)]*\))*)/g,
      handle: (args) => {
        return {
          target: args.workspace`package.json`,
          tooltip: 'Test',
          description: 'Test',
          buttons: [
            {
              title: 'package.json Line 5',
              target: args.workspace`package.json:5`,
            },
            {
              title: 'package.json Line 5 Col 10',
              target: args.workspace`package.json:5:10`,
            }
          ]
        }
      },
    },
  ],
} satisfies Config
