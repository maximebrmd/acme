# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantFailedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::AssistantFailedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :reason, -> { Peal::Types::AssistantFailedEncodedReason }, optional: false, nullable: false
    end
  end
end
