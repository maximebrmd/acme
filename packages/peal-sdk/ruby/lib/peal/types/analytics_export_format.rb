# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AnalyticsExportFormat
      extend Peal::Internal::Types::Enum

      CSV = "csv"
      JSON_ = "json"
    end
  end
end
