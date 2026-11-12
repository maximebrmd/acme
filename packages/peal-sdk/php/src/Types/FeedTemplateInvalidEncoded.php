<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class FeedTemplateInvalidEncoded extends JsonSerializableType
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
     * @var ?string $placeholder
     */
    #[JsonProperty('placeholder')]
    public ?string $placeholder;

    /**
     * @var value-of<FeedTemplateInvalidEncodedReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   reason: value-of<FeedTemplateInvalidEncodedReason>,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     *   placeholder?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->placeholder = $values['placeholder'] ?? null;
        $this->reason = $values['reason'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
