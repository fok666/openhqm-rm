# Typescript Style Guide

## Typescript General
- Use TypeScript for all code
- Enable strict mode in `tsconfig.json`
- Use `interface` for object types and `type` for unions/intersections
- Prefer `const` and `let` over `var`
- Use ES6 modules (`import`/`export`)
- Avoid `any` type, use specific types or generics
- Use `unknown` instead of `any` when the type is not known
- Use `never` for functions that never return
- Use `void` for functions that do not return a value
- Use `enum` for fixed sets of values, but prefer union types when possible
- Use `readonly` for properties that should not be modified
- Use `Partial<T>`, `Required<T>`, `Pick<T, K>`, and `Omit<T, K>` for utility types
- Use `Record<K, T>` for mapping types
