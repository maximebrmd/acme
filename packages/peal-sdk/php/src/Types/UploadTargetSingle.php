<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class UploadTargetSingle extends JsonSerializableType
{
    /**
     * @var string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public string $expiresAt;

    /**
     * @var SignedRequest $request
     */
    #[JsonProperty('request')]
    public SignedRequest $request;

    /**
     * @param array{
     *   expiresAt: string,
     *   request: SignedRequest,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->expiresAt = $values['expiresAt'];
        $this->request = $values['request'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
