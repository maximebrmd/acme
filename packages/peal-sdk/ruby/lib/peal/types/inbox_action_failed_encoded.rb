# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxActionFailedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::InboxActionFailedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :reason, -> { String }, optional: false, nullable: false
    end
  end
end
