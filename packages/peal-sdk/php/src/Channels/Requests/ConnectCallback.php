<?php

namespace Peal\Channels\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ConnectCallback extends JsonSerializableType
{
    /**
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var ?string $error
     */
    #[JsonProperty('error')]
    public ?string $error;

    /**
     * @var ?string $iss
     */
    #[JsonProperty('iss')]
    public ?string $iss;

    /**
     * @var string $state
     */
    #[JsonProperty('state')]
    public string $state;

    /**
     * @param array{
     *   state: string,
     *   code?: ?string,
     *   error?: ?string,
     *   iss?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'] ?? null;
        $this->error = $values['error'] ?? null;
        $this->iss = $values['iss'] ?? null;
        $this->state = $values['state'];
    }
}
