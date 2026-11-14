<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TooManyRequestsEncoded extends JsonSerializableType
{
    /**
     * @var value-of<TooManyRequestsEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

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
     * @var int $limit
     */
    #[JsonProperty('limit')]
    public int $limit;

    /**
     * @var ?value-of<TooManyRequestsEncodedPolicy> $policy
     */
    #[JsonProperty('policy')]
    public ?string $policy;

    /**
     * @var int $retryAfterSeconds
     */
    #[JsonProperty('retryAfterSeconds')]
    public int $retryAfterSeconds;

    /**
     * @var int $windowSeconds
     */
    #[JsonProperty('windowSeconds')]
    public int $windowSeconds;

    /**
     * @var ?int $withPaymentMethod
     */
    #[JsonProperty('withPaymentMethod')]
    public ?int $withPaymentMethod;

    /**
     * @param array{
     *   tag: value-of<TooManyRequestsEncodedTag>,
     *   limit: int,
     *   retryAfterSeconds: int,
     *   windowSeconds: int,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     *   policy?: ?value-of<TooManyRequestsEncodedPolicy>,
     *   withPaymentMethod?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->limit = $values['limit'];
        $this->policy = $values['policy'] ?? null;
        $this->retryAfterSeconds = $values['retryAfterSeconds'];
        $this->windowSeconds = $values['windowSeconds'];
        $this->withPaymentMethod = $values['withPaymentMethod'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
