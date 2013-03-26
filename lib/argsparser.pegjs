{ var args = {} }
start
  = pair ("," " "* pair)* { return args }

pair
  = k:key ":" v:val { args[k]=v }

key "key"
  = chars:[a-zA-Z0-9_$]+ { return chars.join("") }

val "value"
  = noncomma:[^,]+ { return noncomma.join("") }

