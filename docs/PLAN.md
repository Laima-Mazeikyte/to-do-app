# To Do App

## MVP Features

- add, delete and edit 'to do' tasks
- mark 'to do' tasks as done (with ability to uncheck)

## Ideas

- copy day tasks/set up daily repeat tasks
- have a week view
- accountability scheme
- the todos are cards that drop and pile like a bunch of pieces that you can drag and drop and move around 

## Tech stack

- Vite
- Vannila JS
- Supabase for data handling



## The Vision & User Flow

A fun, spatial, habit-builder and todo list. If there's so many of todos that they barelly fit on your screen - it might be time to stop pilling them up 

Base features
- CRUD Operations: Create, Read, Update, Delete.
- State Persistence: Using Supabase so data survives a page refresh.
- Authentication: Using Supabase (including anonymous signup)
- Toggle State: A simple boolean isDone to flip tasks back and forth.

Features afterwards
- People can create a task/todo/goal. It appear as a "card" that falls down into a pile (Physics-based UI).
- People can drag the tasks around and clip/pin them up top
    - Peaple can clip/drag them into a "Prioriy" zone at the top or leave them piled up on the bottom
- Ability to search the list of todos
- "Sink and Sort" approach to the list
- Ability to pin task as priorities
- Ability to group tasks by a theme
- Let people paste a simple list copied from other apps (notes, notion etc) place and create todo cards according to the list


---

## Details on Spatial View

- the card positions in the pile do not have to persist, they should load on each refresh, but the ones that are 'priority zone' should persist, but they will be at the top of the page, not in the pile.

- the spatial arrangement does not have to persist between devices

- there should be a flag for 'priority'


## The "Paste List" Parser

- look for markdown
- treat new line as new card
- it can become a long card with truncation, which is revealed on a click
