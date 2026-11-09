# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UploadRejectedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::UploadRejectedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :reason, -> { Peal::Types::RejectionReason }, optional: false, nullable: false
    end
  end
end
