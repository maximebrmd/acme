# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaImportBusyEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::MediaImportBusyEncodedTag }, optional: false, nullable: false, api_name: "_tag"
    end
  end
end
