<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class SpendCeilingExceededEncoded extends JsonSerializableType
{
    /**
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var ?string $message
     */
    #[JsonProperty('message')]
    public ?string $message;

    /**
     * @var ?string $requestId
     */
    #[JsonProperty('requestId')]
    public ?string $requestId;

    /**
     * @var int $ceiling
     */
    #[JsonProperty('ceiling')]
    public int $ceiling;

    /**
     * @var int $committed
     */
    #[JsonProperty('committed')]
    public int $committed;

    /**
     * @var string $currency
     */
    #[JsonProperty('currency')]
    public string $currency;

    /**
     * @var int $requested
     */
    #[JsonProperty('requested')]
    public int $requested;

    /**
     * @param array{
     *   ceiling: int,
     *   committed: int,
     *   currency: string,
     *   requested: int,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->ceiling = $values['ceiling'];
        $this->committed = $values['committed'];
        $this->currency = $values['currency'];
        $this->requested = $values['requested'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
