from owlready2 import get_ontology, Thing, ObjectProperty, DataProperty

ONTO_IRI = "http://example.org/gamifyont.owl#"

def build(path: str = "GamifyOnt.owl"):
    onto = get_ontology(ONTO_IRI)

    with onto:
        class GamificationProject(Thing): pass
        class SpecDocument(Thing): pass
        class SpecSection(Thing): pass

        class GameElement(Thing): pass
        class Mechanic(Thing): pass
        class Dynamic(Thing): pass
        class Reward(Thing): pass
        class PlayerType(Thing): pass
        class KPI(Thing): pass
        class Event(Thing): pass
        class UIComponent(Thing): pass

        class Points(GameElement): pass
        class Badge(GameElement): pass
        class Leaderboard(GameElement): pass
        class Level(GameElement): pass
        class Quest(GameElement): pass

        class hasSection(ObjectProperty):
            domain = [SpecDocument]
            range  = [SpecSection]

        class definesElement(ObjectProperty):
            domain = [SpecSection]
            range  = [GameElement]

        class realizedAsUI(ObjectProperty):
            domain = [GameElement]
            range  = [UIComponent]

        class pointsValue(DataProperty):
            domain = [Points]
            range  = [int]
                class hasGameElement(ObjectProperty):
            domain = [SpecDocument]
            range  = [GameElement]

        class hasKPI(ObjectProperty):
            domain = [SpecDocument]
            range  = [KPI]

        class hasUIComponent(ObjectProperty):
            domain = [SpecDocument]
            range  = [UIComponent]

    onto.save(file=path, format="rdfxml")
    print(f"Saved ontology -> {path}")

if __name__ == "__main__":
    build()
