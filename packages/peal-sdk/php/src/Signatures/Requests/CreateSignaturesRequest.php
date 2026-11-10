<?php

namespace Peal\Signatures\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\SignatureDetails;

class CreateSignaturesRequest extends JsonSerializableType
{
    /**
     * @var SignatureDetails $body
     */
    public SignatureDetails $body;

    /**
     * @param array{
     *   body: SignatureDetails,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
