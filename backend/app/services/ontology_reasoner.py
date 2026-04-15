from owlready2 import get_ontology, sync_reasoner

def validate_ontology(path: str):
    onto = get_ontology(path).load()

    with onto:
        sync_reasoner()

    return {
        "classes": len(list(onto.classes())),
        "individuals": len(list(onto.individuals()))
    }
