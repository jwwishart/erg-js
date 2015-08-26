Starting Afresh

The lexer and parser are ok. Though I would like to
maybe get rid of the need for the lexer to be visible and
close a lot of visibility issues

The core structure will be:
- executable ergjs node script
    - takes 1 or more files
    - constructs a ProgramNode
    - adds FileNode items for each file passed in
        - as it's passing further FileNode items will
          be added to the ProgramNode
- Use constructor functions for nodes instead of raw
  though raw function use should return
- accept/expect should take ast node type

- Privacy more important
- Simplify parser.peek() all the type accept should 
  just look at the next token.