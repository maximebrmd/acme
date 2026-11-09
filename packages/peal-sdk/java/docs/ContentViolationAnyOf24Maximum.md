

# ContentViolationAnyOf24Maximum

## anyOf schemas
* [BigDecimal](BigDecimal.md)
* [NonFiniteNumber](NonFiniteNumber.md)

## Example
```java
// Import classes:
import social.peal.model.ContentViolationAnyOf24Maximum;
import social.peal.model.BigDecimal;
import social.peal.model.NonFiniteNumber;

public class Example {
    public static void main(String[] args) {
        ContentViolationAnyOf24Maximum exampleContentViolationAnyOf24Maximum = new ContentViolationAnyOf24Maximum();

        // create a new BigDecimal
        BigDecimal exampleBigDecimal = new BigDecimal();
        // set ContentViolationAnyOf24Maximum to BigDecimal
        exampleContentViolationAnyOf24Maximum.setActualInstance(exampleBigDecimal);
        // to get back the BigDecimal set earlier
        BigDecimal testBigDecimal = (BigDecimal) exampleContentViolationAnyOf24Maximum.getActualInstance();

        // create a new NonFiniteNumber
        NonFiniteNumber exampleNonFiniteNumber = new NonFiniteNumber();
        // set ContentViolationAnyOf24Maximum to NonFiniteNumber
        exampleContentViolationAnyOf24Maximum.setActualInstance(exampleNonFiniteNumber);
        // to get back the NonFiniteNumber set earlier
        NonFiniteNumber testNonFiniteNumber = (NonFiniteNumber) exampleContentViolationAnyOf24Maximum.getActualInstance();
    }
}
```


