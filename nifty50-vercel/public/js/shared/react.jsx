// React is loaded from the CDN as a global (see the <script> tags in each page).
// Every .jsx file on a page shares one global scope, so hooks are pulled out once here.
const { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } = React;
