

# ConnectOutcome

## anyOf schemas
* [ConnectOutcomeAnyOf](ConnectOutcomeAnyOf.md)
* [ConnectOutcomeAnyOf1](ConnectOutcomeAnyOf1.md)

## Example
```java
// Import classes:
import social.peal.model.ConnectOutcome;
import social.peal.model.ConnectOutcomeAnyOf;
import social.peal.model.ConnectOutcomeAnyOf1;

public class Example {
    public static void main(String[] args) {
        ConnectOutcome exampleConnectOutcome = new ConnectOutcome();

        // create a new ConnectOutcomeAnyOf
        ConnectOutcomeAnyOf exampleConnectOutcomeAnyOf = new ConnectOutcomeAnyOf();
        // set ConnectOutcome to ConnectOutcomeAnyOf
        exampleConnectOutcome.setActualInstance(exampleConnectOutcomeAnyOf);
        // to get back the ConnectOutcomeAnyOf set earlier
        ConnectOutcomeAnyOf testConnectOutcomeAnyOf = (ConnectOutcomeAnyOf) exampleConnectOutcome.getActualInstance();

        // create a new ConnectOutcomeAnyOf1
        ConnectOutcomeAnyOf1 exampleConnectOutcomeAnyOf1 = new ConnectOutcomeAnyOf1();
        // set ConnectOutcome to ConnectOutcomeAnyOf1
        exampleConnectOutcome.setActualInstance(exampleConnectOutcomeAnyOf1);
        // to get back the ConnectOutcomeAnyOf1 set earlier
        ConnectOutcomeAnyOf1 testConnectOutcomeAnyOf1 = (ConnectOutcomeAnyOf1) exampleConnectOutcome.getActualInstance();
    }
}
```


