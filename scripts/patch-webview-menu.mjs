import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const webviewDir = path.join(projectRoot, 'node_modules', 'react-native-webview')

const IOS_MENU_OLD = `  if (!self.menuItems) {
      return [super canPerformAction:action withSender:sender];
  }

  return NO;
}
- (void)buildMenuWithBuilder:(id<UIMenuBuilder>)builder API_AVAILABLE(ios(13.0))  {
    if (@available(iOS 16.0, *)) {
      if(self.menuItems){
        [builder removeMenuForIdentifier:UIMenuLookup];
      }
    }
    [super buildMenuWithBuilder:builder];
}`

const IOS_MENU_NEW = `  return [super canPerformAction:action withSender:sender];
}
- (void)buildMenuWithBuilder:(id<UIMenuBuilder>)builder API_AVAILABLE(ios(13.0))  {
    [super buildMenuWithBuilder:builder];
    if (@available(iOS 16.0, *)) {
      if (self.menuItems.count > 0) {
        NSMutableArray<UIMenuElement *> *commands = [NSMutableArray new];
        for (NSDictionary *menuItem in self.menuItems) {
          NSString *sel = [NSString stringWithFormat:@"%@%@", CUSTOM_SELECTOR, menuItem[@"key"]];
          [commands addObject:[UICommand commandWithTitle:menuItem[@"label"]
                                                    image:nil
                                                   action:NSSelectorFromString(sel)
                                             propertyList:nil]];
        }
        UIMenu *customMenu = [UIMenu menuWithTitle:@""
                                             image:nil
                                        identifier:@"com.pearnotes.webview.custom"
                                           options:UIMenuOptionsDisplayInline
                                          children:commands];
        [builder insertChildMenu:customMenu atStartOfMenuForIdentifier:UIMenuRoot];
      }
    }
}`

const IOS_LONG_PRESS_OLD = `  if (self.menuItems != nil) {
    UILongPressGestureRecognizer *longPress`

const IOS_LONG_PRESS_NEW = `  if (NO) {
    UILongPressGestureRecognizer *longPress`

const ANDROID_OLD = `      return super.startActionMode(new ActionMode.Callback2() {
        @Override
        public boolean onCreateActionMode(ActionMode mode, Menu menu) {
          for (int i = 0; i < menuCustomItems.size(); i++) {
            menu.add(Menu.NONE, i, i, (menuCustomItems.get(i)).get("label"));
          }
          return true;
        }

        @Override
        public boolean onPrepareActionMode(ActionMode actionMode, Menu menu) {
          return false;
        }

        @Override
        public boolean onActionItemClicked(ActionMode mode, MenuItem item) {
          WritableMap wMap = Arguments.createMap();`

const ANDROID_NEW = `      final int customGroup = 0x5e4a1;
      return super.startActionMode(new ActionMode.Callback2() {
        private void addCustomItems(Menu menu) {
          menu.removeGroup(customGroup);
          for (int i = 0; i < menuCustomItems.size(); i++) {
            menu.add(customGroup, i, Menu.CATEGORY_SECONDARY + i, (menuCustomItems.get(i)).get("label"));
          }
        }

        @Override
        public boolean onCreateActionMode(ActionMode mode, Menu menu) {
          boolean created = callback.onCreateActionMode(mode, menu);
          addCustomItems(menu);
          return created || menu.size() > 0;
        }

        @Override
        public boolean onPrepareActionMode(ActionMode actionMode, Menu menu) {
          callback.onPrepareActionMode(actionMode, menu);
          addCustomItems(menu);
          return true;
        }

        @Override
        public boolean onActionItemClicked(ActionMode mode, MenuItem item) {
          if (item.getGroupId() != customGroup) {
            return callback.onActionItemClicked(mode, item);
          }
          WritableMap wMap = Arguments.createMap();`

const ANDROID_DESTROY_OLD = `        public void onDestroyActionMode(ActionMode mode) {
          mode = null;
        }`

const ANDROID_DESTROY_NEW = `        public void onDestroyActionMode(ActionMode mode) {
          callback.onDestroyActionMode(mode);
        }`

const PATCHES = [
  {
    file: path.join(webviewDir, 'apple', 'RNCWebViewImpl.m'),
    replacements: [
      [IOS_MENU_OLD, IOS_MENU_NEW],
      [IOS_LONG_PRESS_OLD, IOS_LONG_PRESS_NEW],
    ],
  },
  {
    file: path.join(
      webviewDir,
      'android',
      'src',
      'main',
      'java',
      'com',
      'reactnativecommunity',
      'webview',
      'RNCWebView.java',
    ),
    replacements: [
      [ANDROID_OLD, ANDROID_NEW],
      [ANDROID_DESTROY_OLD, ANDROID_DESTROY_NEW],
    ],
  },
]

if (!fs.existsSync(webviewDir)) {
  console.log('react-native-webview is not installed, skipping selection menu patch')
  process.exit(0)
}

let failed = false
for (const patch of PATCHES) {
  let source = fs.readFileSync(patch.file, 'utf8')
  for (const [before, after] of patch.replacements) {
    if (source.includes(after)) continue
    if (!source.includes(before)) {
      console.error(
        `Selection menu patch no longer matches ${path.relative(projectRoot, patch.file)}`,
      )
      failed = true
      continue
    }
    source = source.replace(before, after)
  }
  fs.writeFileSync(patch.file, source)
}

if (failed) process.exit(1)
console.log(
  'Patched react-native-webview to add custom selection menu items next to the system ones',
)
