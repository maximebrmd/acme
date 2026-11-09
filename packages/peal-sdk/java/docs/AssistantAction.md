

# AssistantAction

## anyOf schemas
* [AssistantActionAnyOf](AssistantActionAnyOf.md)
* [AssistantActionAnyOf1](AssistantActionAnyOf1.md)
* [AssistantActionAnyOf2](AssistantActionAnyOf2.md)
* [AssistantActionAnyOf3](AssistantActionAnyOf3.md)

## Example
```java
// Import classes:
import social.peal.model.AssistantAction;
import social.peal.model.AssistantActionAnyOf;
import social.peal.model.AssistantActionAnyOf1;
import social.peal.model.AssistantActionAnyOf2;
import social.peal.model.AssistantActionAnyOf3;

public class Example {
    public static void main(String[] args) {
        AssistantAction exampleAssistantAction = new AssistantAction();

        // create a new AssistantActionAnyOf
        AssistantActionAnyOf exampleAssistantActionAnyOf = new AssistantActionAnyOf();
        // set AssistantAction to AssistantActionAnyOf
        exampleAssistantAction.setActualInstance(exampleAssistantActionAnyOf);
        // to get back the AssistantActionAnyOf set earlier
        AssistantActionAnyOf testAssistantActionAnyOf = (AssistantActionAnyOf) exampleAssistantAction.getActualInstance();

        // create a new AssistantActionAnyOf1
        AssistantActionAnyOf1 exampleAssistantActionAnyOf1 = new AssistantActionAnyOf1();
        // set AssistantAction to AssistantActionAnyOf1
        exampleAssistantAction.setActualInstance(exampleAssistantActionAnyOf1);
        // to get back the AssistantActionAnyOf1 set earlier
        AssistantActionAnyOf1 testAssistantActionAnyOf1 = (AssistantActionAnyOf1) exampleAssistantAction.getActualInstance();

        // create a new AssistantActionAnyOf2
        AssistantActionAnyOf2 exampleAssistantActionAnyOf2 = new AssistantActionAnyOf2();
        // set AssistantAction to AssistantActionAnyOf2
        exampleAssistantAction.setActualInstance(exampleAssistantActionAnyOf2);
        // to get back the AssistantActionAnyOf2 set earlier
        AssistantActionAnyOf2 testAssistantActionAnyOf2 = (AssistantActionAnyOf2) exampleAssistantAction.getActualInstance();

        // create a new AssistantActionAnyOf3
        AssistantActionAnyOf3 exampleAssistantActionAnyOf3 = new AssistantActionAnyOf3();
        // set AssistantAction to AssistantActionAnyOf3
        exampleAssistantAction.setActualInstance(exampleAssistantActionAnyOf3);
        // to get back the AssistantActionAnyOf3 set earlier
        AssistantActionAnyOf3 testAssistantActionAnyOf3 = (AssistantActionAnyOf3) exampleAssistantAction.getActualInstance();
    }
}
```


