<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class SignedRequest extends JsonSerializableType
{
    /**
     * @var array<string, string> $headers
     */
    #[JsonProperty('headers'), ArrayType(['string' => 'string'])]
    public array $headers;

    /**
     * @var value-of<SignedRequestMethod> $method
     */
    #[JsonProperty('method')]
    public string $method;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @param array{
     *   headers: array<string, string>,
     *   method: value-of<SignedRequestMethod>,
     *   url: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->headers = $values['headers'];
        $this->method = $values['method'];
        $this->url = $values['url'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
