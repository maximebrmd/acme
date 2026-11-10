# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class IdempotencyKeyReusedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::IdempotencyKeyReusedEncodedTag }, optional: false, nullable: false, api_name: "_tag"
    end
  end
end
