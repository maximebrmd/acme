# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module DatabaseUnavailableEncodedTag
      extend Peal::Internal::Types::Enum

      DATABASE_UNAVAILABLE = "DatabaseUnavailable"
    end
  end
end
