

# Suggestion

## anyOf schemas
* [SuggestionAnyOf](SuggestionAnyOf.md)
* [SuggestionAnyOf1](SuggestionAnyOf1.md)

## Example
```java
// Import classes:
import social.peal.model.Suggestion;
import social.peal.model.SuggestionAnyOf;
import social.peal.model.SuggestionAnyOf1;

public class Example {
    public static void main(String[] args) {
        Suggestion exampleSuggestion = new Suggestion();

        // create a new SuggestionAnyOf
        SuggestionAnyOf exampleSuggestionAnyOf = new SuggestionAnyOf();
        // set Suggestion to SuggestionAnyOf
        exampleSuggestion.setActualInstance(exampleSuggestionAnyOf);
        // to get back the SuggestionAnyOf set earlier
        SuggestionAnyOf testSuggestionAnyOf = (SuggestionAnyOf) exampleSuggestion.getActualInstance();

        // create a new SuggestionAnyOf1
        SuggestionAnyOf1 exampleSuggestionAnyOf1 = new SuggestionAnyOf1();
        // set Suggestion to SuggestionAnyOf1
        exampleSuggestion.setActualInstance(exampleSuggestionAnyOf1);
        // to get back the SuggestionAnyOf1 set earlier
        SuggestionAnyOf1 testSuggestionAnyOf1 = (SuggestionAnyOf1) exampleSuggestion.getActualInstance();
    }
}
```


