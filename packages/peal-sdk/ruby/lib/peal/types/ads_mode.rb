# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AdsMode
      extend Peal::Internal::Types::Enum

      OFF = "off"
      READ = "read"
      SPEND = "spend"
    end
  end
end
